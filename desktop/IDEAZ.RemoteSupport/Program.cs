using System.Security.Cryptography;

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
        StartFreshSession();
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
            ActionButton("Generate New Details", StartFreshSession, secondary: true),
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
            ActionButton("Request Access", RequestAccess),
            Info("The other person must press Allow before any control can start.")
        ));
        return card;
    }

    private void StartFreshSession()
    {
        sessionId = RandomNumberGenerator.GetInt32(100_000_000, 1_000_000_000).ToString();
        sessionPassword = GeneratePassword(10);
        sessionIdValue.Text = $"{sessionId[..3]} {sessionId[3..6]} {sessionId[6..]}";
        sessionPasswordValue.Text = sessionPassword;
        statusLabel.Text = "New one-time details generated — access is off";
        statusLabel.ForeColor = Color.FromArgb(52, 211, 153);
    }

    private void RequestAccess()
    {
        var id = new string(remoteIdInput.Text.Where(char.IsDigit).ToArray());
        if (id.Length != 9 || remotePasswordInput.Text.Trim().Length < 8)
        {
            statusLabel.Text = "Valid 9-digit ID aur one-time password enter karein.";
            statusLabel.ForeColor = Color.FromArgb(248, 113, 113);
            return;
        }

        MessageBox.Show(
            "Secure relay connection is the next implementation layer.\n\n" +
            "No access has been granted and no mouse/keyboard control is active.",
            "IDEAZ Remote Support",
            MessageBoxButtons.OK,
            MessageBoxIcon.Information);
        statusLabel.Text = "Access is still off — waiting for secure relay integration";
        statusLabel.ForeColor = Color.FromArgb(251, 191, 36);
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
