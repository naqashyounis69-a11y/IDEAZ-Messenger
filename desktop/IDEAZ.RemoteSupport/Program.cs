using System.Security.Cryptography;
using System.Drawing.Imaging;
using System.Net.Http.Json;
using System.Runtime.InteropServices;
using System.Text.Json;

namespace IDEAZ.RemoteSupport;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm());
    }
}

internal sealed class MainForm : Form
{
    private readonly Label sessionIdValue = ValueLabel();
    private readonly Label sessionPasswordValue = ValueLabel();
    private readonly TextBox remoteIdInput = Input("000 000 000");
    private readonly TextBox remotePasswordInput = Input("One-time password");
    private readonly Label statusLabel = new()
    {
        AutoSize = false,
        Height = 46,
        Dock = DockStyle.Top,
        TextAlign = ContentAlignment.MiddleCenter,
        ForeColor = Color.FromArgb(148, 163, 184),
        Text = "Ready — access is off",
    };

    private string sessionId = string.Empty;
    private string sessionPassword = string.Empty;
    private string? hostToken;
    private CancellationTokenSource sessionCancellation = new();
    private readonly RemoteClient remote = new();

    public MainForm()
    {
        Text = "IDEAZ Remote Support";
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(900, 620);
        Size = new Size(980, 690);
        BackColor = Color.FromArgb(5, 12, 28);
        ForeColor = Color.White;
        Font = new Font("Segoe UI", 10F);

        Controls.Add(BuildPage());
        _ = StartFreshSessionAsync();
        FormClosing += async (_, _) => await EndSessionAsync();
    }

    private Control BuildPage()
    {
        var page = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            Padding = new Padding(36),
            ColumnCount = 2,
            RowCount = 3,
        };
        page.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        page.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 50));
        page.RowStyles.Add(new RowStyle(SizeType.Absolute, 96));
        page.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        page.RowStyles.Add(new RowStyle(SizeType.Absolute, 52));

        var title = new Label
        {
            Text = "IDEAZ Remote Support\nSecure one-time access",
            Dock = DockStyle.Fill,
            Font = new Font("Segoe UI", 23F, FontStyle.Bold),
            ForeColor = Color.White,
        };
        page.Controls.Add(title, 0, 0);
        page.SetColumnSpan(title, 2);

        page.Controls.Add(BuildShareCard(), 0, 1);
        page.Controls.Add(BuildConnectCard(), 1, 1);
        page.Controls.Add(statusLabel, 0, 2);
        page.SetColumnSpan(statusLabel, 2);
        return page;
    }

    private Control BuildShareCard()
    {
        var card = Card();
        card.Padding = new Padding(28);
        card.Controls.Add(Stack(
            Heading("Allow someone to help"),
            Info("Every app launch creates a new ID and password. Old details stop working."),
            FieldTitle("Your User ID"),
            ValueRow(sessionIdValue, "Copy ID", () => Copy(sessionId)),
            FieldTitle("One-time Password"),
            ValueRow(sessionPasswordValue, "Copy Password", () => Copy(sessionPassword)),
            ActionButton("Generate New Details", () => _ = StartFreshSessionAsync(), secondary: true),
            Info("Never share these details unless you started the support session.")
        ));
        return card;
    }

    private Control BuildConnectCard()
    {
        var card = Card();
        card.Padding = new Padding(28);
        remotePasswordInput.UseSystemPasswordChar = true;
        card.Controls.Add(Stack(
            Heading("Access another computer"),
            Info("Enter the fresh ID and password shown on the other computer."),
            FieldTitle("Remote User ID"),
            remoteIdInput,
            FieldTitle("One-time Password"),
            remotePasswordInput,
            ActionButton("Request Access", () => _ = RequestAccessAsync()),
            Info("The other person must press Allow before any control can start.")
        ));
        return card;
    }

    private async Task StartFreshSessionAsync()
    {
        await EndSessionAsync();
        sessionCancellation = new CancellationTokenSource();
        sessionId = RandomNumberGenerator.GetInt32(100_000_000, 1_000_000_000).ToString();
        sessionPassword = GeneratePassword(10);
        sessionIdValue.Text = $"{sessionId[..3]} {sessionId[3..6]} {sessionId[6..]}";
        sessionPasswordValue.Text = sessionPassword;
        statusLabel.Text = "New one-time details generated — access is off";
        statusLabel.ForeColor = Color.FromArgb(52, 211, 153);
        try
        {
            hostToken = await remote.CreateSessionAsync(sessionId, sessionPassword, sessionCancellation.Token);
            _ = PollHostAsync(sessionCancellation.Token);
        }
        catch
        {
            statusLabel.Text = "Server connect nahi hua — internet check karein.";
            statusLabel.ForeColor = Color.FromArgb(248, 113, 113);
        }
    }

    private async Task RequestAccessAsync()
    {
        var id = new string(remoteIdInput.Text.Where(char.IsDigit).ToArray());
        if (id.Length != 9 || remotePasswordInput.Text.Trim().Length < 8)
        {
            statusLabel.Text = "Valid 9-digit ID aur one-time password enter karein.";
            statusLabel.ForeColor = Color.FromArgb(248, 113, 113);
            return;
        }
        try
        {
            statusLabel.Text = "Other computer ki permission ka wait ho raha hai...";
            var controllerToken = await remote.ConnectAsync(id, remotePasswordInput.Text.Trim(), CancellationToken.None);
            using var viewer = new ViewerForm(remote, id, controllerToken);
            Hide();
            viewer.ShowDialog(this);
            Show();
            statusLabel.Text = "Remote session ended — access is off";
        }
        catch (Exception error)
        {
            statusLabel.Text = error.Message;
            statusLabel.ForeColor = Color.FromArgb(248, 113, 113);
        }
    }

    private async Task PollHostAsync(CancellationToken cancellationToken)
    {
        var approved = false;
        while (!cancellationToken.IsCancellationRequested && hostToken is not null)
        {
            try
            {
                var state = await remote.GetStatusAsync(sessionId, hostToken, cancellationToken);
                if (state == "pending" && !approved)
                {
                    var allow = Invoke(() => MessageBox.Show(
                        "Koi user aapke computer ka access maang raha hai.\n\nAllow karne par screen, mouse aur keyboard share honge.",
                        "Remote Access Request",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Warning,
                        MessageBoxDefaultButton.Button2) == DialogResult.Yes);
                    await remote.DecideAsync(sessionId, hostToken, allow, cancellationToken);
                    if (!allow) continue;
                    approved = true;
                    Invoke(() =>
                    {
                        statusLabel.Text = "REMOTE ACCESS ACTIVE — Stop Access ke liye app band karein";
                        statusLabel.ForeColor = Color.FromArgb(248, 113, 113);
                        TopMost = true;
                    });
                    _ = CaptureLoopAsync(cancellationToken);
                    _ = InputLoopAsync(cancellationToken);
                }
                if (state is "ended" or "rejected") break;
            }
            catch when (!cancellationToken.IsCancellationRequested) { }
            await Task.Delay(900, cancellationToken).ContinueWith(_ => { }, TaskScheduler.Default);
        }
    }

    private async Task CaptureLoopAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested && hostToken is not null)
        {
            try
            {
                using var bitmap = new Bitmap(Screen.PrimaryScreen!.Bounds.Width, Screen.PrimaryScreen.Bounds.Height);
                using (var graphics = Graphics.FromImage(bitmap)) graphics.CopyFromScreen(Screen.PrimaryScreen.Bounds.Location, Point.Empty, bitmap.Size);
                using var resized = new Bitmap(bitmap, new Size(1280, Math.Max(1, bitmap.Height * 1280 / bitmap.Width)));
                using var stream = new MemoryStream();
                var encoder = ImageCodecInfo.GetImageEncoders().First(x => x.FormatID == ImageFormat.Jpeg.Guid);
                using var parameters = new EncoderParameters(1);
                parameters.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 55L);
                resized.Save(stream, encoder, parameters);
                await remote.SendFrameAsync(sessionId, hostToken, "data:image/jpeg;base64," + Convert.ToBase64String(stream.ToArray()), cancellationToken);
            }
            catch when (!cancellationToken.IsCancellationRequested) { }
            await Task.Delay(350, cancellationToken).ContinueWith(_ => { }, TaskScheduler.Default);
        }
    }

    private async Task InputLoopAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested && hostToken is not null)
        {
            try
            {
                foreach (var input in await remote.GetInputsAsync(sessionId, hostToken, cancellationToken)) NativeInput.Apply(input);
            }
            catch when (!cancellationToken.IsCancellationRequested) { }
            await Task.Delay(100, cancellationToken).ContinueWith(_ => { }, TaskScheduler.Default);
        }
    }

    private async Task EndSessionAsync()
    {
        sessionCancellation.Cancel();
        if (hostToken is not null)
        {
            try { await remote.EndAsync(sessionId, hostToken); } catch { }
        }
        hostToken = null;
        TopMost = false;
    }

    private static string GeneratePassword(int length)
    {
        const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#";
        return string.Concat(Enumerable.Range(0, length)
            .Select(_ => alphabet[RandomNumberGenerator.GetInt32(alphabet.Length)]));
    }

    private static void Copy(string value)
    {
        Clipboard.SetText(value);
    }

    private static Panel Card() => new()
    {
        Dock = DockStyle.Fill,
        Margin = new Padding(10),
        BackColor = Color.FromArgb(15, 27, 48),
    };

    private static FlowLayoutPanel Stack(params Control[] controls)
    {
        var stack = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill,
            FlowDirection = FlowDirection.TopDown,
            WrapContents = false,
            AutoScroll = true,
        };
        foreach (var control in controls)
        {
            control.Margin = new Padding(0, 0, 0, 13);
            stack.Controls.Add(control);
        }
        stack.Resize += (_, _) =>
        {
            foreach (Control control in stack.Controls) control.Width = Math.Max(250, stack.ClientSize.Width - 24);
        };
        return stack;
    }

    private static Label Heading(string text) => new()
    {
        Text = text,
        AutoSize = false,
        Height = 48,
        Font = new Font("Segoe UI", 18F, FontStyle.Bold),
        ForeColor = Color.White,
    };

    private static Label Info(string text) => new()
    {
        Text = text,
        AutoSize = false,
        Height = 50,
        ForeColor = Color.FromArgb(148, 163, 184),
    };

    private static Label FieldTitle(string text) => new()
    {
        Text = text,
        AutoSize = false,
        Height = 24,
        Font = new Font("Segoe UI", 9F, FontStyle.Bold),
        ForeColor = Color.FromArgb(196, 181, 253),
    };

    private static Label ValueLabel() => new()
    {
        AutoSize = false,
        Height = 50,
        TextAlign = ContentAlignment.MiddleLeft,
        Padding = new Padding(14, 0, 14, 0),
        Font = new Font("Consolas", 15F, FontStyle.Bold),
        BackColor = Color.FromArgb(8, 17, 34),
        ForeColor = Color.White,
    };

    private static TextBox Input(string placeholder) => new()
    {
        Height = 45,
        PlaceholderText = placeholder,
        BackColor = Color.FromArgb(8, 17, 34),
        ForeColor = Color.White,
        BorderStyle = BorderStyle.FixedSingle,
        Font = new Font("Segoe UI", 12F),
    };

    private static Control ValueRow(Label value, string buttonText, Action action)
    {
        var row = new TableLayoutPanel { Height = 52, ColumnCount = 2 };
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 68));
        row.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 32));
        row.Controls.Add(value, 0, 0);
        row.Controls.Add(ActionButton(buttonText, action, secondary: true), 1, 0);
        return row;
    }

    private static Button ActionButton(string text, Action action, bool secondary = false)
    {
        var button = new Button
        {
            Text = text,
            Height = 48,
            FlatStyle = FlatStyle.Flat,
            BackColor = secondary ? Color.FromArgb(51, 65, 85) : Color.FromArgb(79, 70, 229),
            ForeColor = Color.White,
            Font = new Font("Segoe UI", 10F, FontStyle.Bold),
            Cursor = Cursors.Hand,
        };
        button.FlatAppearance.BorderSize = 0;
        button.Click += (_, _) => action();
        return button;
    }
}

internal sealed class RemoteClient
{
    private const string BaseUrl = "https://ideaz-messenger.bonto.run/api/remote/";
    private readonly HttpClient http = new() { BaseAddress = new Uri(BaseUrl), Timeout = TimeSpan.FromSeconds(15) };

    public async Task<string> CreateSessionAsync(string id, string password, CancellationToken token)
    {
        var response = await http.PostAsJsonAsync("sessions", new { sessionId = id, password }, token);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: token)).GetProperty("hostToken").GetString()!;
    }

    public async Task<string> ConnectAsync(string id, string password, CancellationToken token)
    {
        var response = await http.PostAsJsonAsync("connect", new { sessionId = id, password }, token);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: token);
            throw new InvalidOperationException(body.TryGetProperty("message", out var message) ? message.GetString() : "Connection failed.");
        }
        return (await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: token)).GetProperty("controllerToken").GetString()!;
    }

    public async Task<string> GetStatusAsync(string id, string credential, CancellationToken token)
    {
        using var request = Request(HttpMethod.Get, $"sessions/{id}/status", credential);
        var response = await http.SendAsync(request, token);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: token)).GetProperty("state").GetString()!;
    }

    public async Task DecideAsync(string id, string credential, bool allow, CancellationToken token)
    {
        using var request = Request(HttpMethod.Post, $"sessions/{id}/decision", credential, new { allow });
        (await http.SendAsync(request, token)).EnsureSuccessStatusCode();
    }

    public async Task SendFrameAsync(string id, string credential, string frame, CancellationToken token)
    {
        using var request = Request(HttpMethod.Post, $"sessions/{id}/frame", credential, new { frame });
        (await http.SendAsync(request, token)).EnsureSuccessStatusCode();
    }

    public async Task<string?> GetFrameAsync(string id, string credential, CancellationToken token)
    {
        using var request = Request(HttpMethod.Get, $"sessions/{id}/frame", credential);
        var response = await http.SendAsync(request, token);
        if (!response.IsSuccessStatusCode) return null;
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: token);
        return body.TryGetProperty("frame", out var frame) && frame.ValueKind == JsonValueKind.String ? frame.GetString() : null;
    }

    public async Task SendInputAsync(string id, string credential, object input, CancellationToken token)
    {
        using var request = Request(HttpMethod.Post, $"sessions/{id}/input", credential, new { @event = input });
        await http.SendAsync(request, token);
    }

    public async Task<List<RemoteInput>> GetInputsAsync(string id, string credential, CancellationToken token)
    {
        using var request = Request(HttpMethod.Get, $"sessions/{id}/input", credential);
        var response = await http.SendAsync(request, token);
        if (!response.IsSuccessStatusCode) return [];
        var body = await response.Content.ReadFromJsonAsync<InputResponse>(cancellationToken: token);
        return body?.Events ?? [];
    }

    public async Task EndAsync(string id, string credential)
    {
        using var request = Request(HttpMethod.Post, $"sessions/{id}/end", credential, new { });
        await http.SendAsync(request);
    }

    private static HttpRequestMessage Request(HttpMethod method, string url, string credential, object? body = null)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("X-Remote-Token", credential);
        if (body is not null) request.Content = JsonContent.Create(body);
        return request;
    }
}

internal sealed class ViewerForm : Form
{
    private readonly RemoteClient remote;
    private readonly string id;
    private readonly string credential;
    private readonly CancellationTokenSource cancellation = new();
    private readonly PictureBox picture = new() { Dock = DockStyle.Fill, SizeMode = PictureBoxSizeMode.Zoom, BackColor = Color.Black };
    private readonly Label state = new() { Dock = DockStyle.Top, Height = 42, TextAlign = ContentAlignment.MiddleCenter, Text = "Waiting for Allow...", BackColor = Color.FromArgb(15, 27, 48), ForeColor = Color.White };

    public ViewerForm(RemoteClient remote, string id, string credential)
    {
        this.remote = remote; this.id = id; this.credential = credential;
        Text = "IDEAZ Remote Control"; WindowState = FormWindowState.Maximized; KeyPreview = true;
        Controls.Add(picture); Controls.Add(state);
        picture.MouseMove += (_, e) => SendPointer("move", e, null);
        picture.MouseDown += (_, e) => SendPointer("click", e, e.Button == MouseButtons.Right ? "right" : "left");
        KeyDown += (_, e) => _ = remote.SendInputAsync(id, credential, new { type = "key", key = (int)e.KeyCode, down = true }, cancellation.Token);
        KeyUp += (_, e) => _ = remote.SendInputAsync(id, credential, new { type = "key", key = (int)e.KeyCode, down = false }, cancellation.Token);
        FormClosing += async (_, _) => { cancellation.Cancel(); try { await remote.EndAsync(id, credential); } catch { } };
        _ = RunAsync();
    }

    private async Task RunAsync()
    {
        while (!cancellation.IsCancellationRequested)
        {
            try
            {
                var status = await remote.GetStatusAsync(id, credential, cancellation.Token);
                state.Text = status == "active" ? "REMOTE CONTROL ACTIVE — close window to stop" : "Waiting for host Allow...";
                if (status == "active")
                {
                    var frame = await remote.GetFrameAsync(id, credential, cancellation.Token);
                    if (frame is not null)
                    {
                        var bytes = Convert.FromBase64String(frame[(frame.IndexOf(',') + 1)..]);
                        using var stream = new MemoryStream(bytes);
                        using var loaded = Image.FromStream(stream);
                        var next = new Bitmap(loaded);
                        var old = picture.Image; picture.Image = next; old?.Dispose();
                    }
                }
                if (status is "ended" or "rejected") { Close(); return; }
            }
            catch when (!cancellation.IsCancellationRequested) { }
            await Task.Delay(300, cancellation.Token).ContinueWith(_ => { }, TaskScheduler.Default);
        }
    }

    private void SendPointer(string type, MouseEventArgs e, string? button)
    {
        if (picture.ClientSize.Width == 0 || picture.ClientSize.Height == 0) return;
        var x = Math.Clamp((double)e.X / picture.ClientSize.Width, 0, 1);
        var y = Math.Clamp((double)e.Y / picture.ClientSize.Height, 0, 1);
        _ = remote.SendInputAsync(id, credential, new { type, x, y, button }, cancellation.Token);
    }
}

internal sealed record InputResponse(List<RemoteInput> Events);
internal sealed record RemoteInput(string Type, double X, double Y, string? Button, int Key, bool Down);

internal static class NativeInput
{
    [DllImport("user32.dll")] private static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] private static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
    [DllImport("user32.dll")] private static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);
    private const uint LeftDown = 0x0002, LeftUp = 0x0004, RightDown = 0x0008, RightUp = 0x0010, KeyUp = 0x0002;

    public static void Apply(RemoteInput input)
    {
        var bounds = Screen.PrimaryScreen!.Bounds;
        if (input.Type is "move" or "click") SetCursorPos((int)(input.X * bounds.Width), (int)(input.Y * bounds.Height));
        if (input.Type == "click")
        {
            var right = input.Button == "right";
            mouse_event(right ? RightDown : LeftDown, 0, 0, 0, UIntPtr.Zero);
            mouse_event(right ? RightUp : LeftUp, 0, 0, 0, UIntPtr.Zero);
        }
        if (input.Type == "key" && input.Key is > 0 and < 256) keybd_event((byte)input.Key, 0, input.Down ? 0u : KeyUp, UIntPtr.Zero);
    }
}
