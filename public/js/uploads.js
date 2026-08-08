(function () {
  let context;
  let recorder;
  let stream;
  let microphoneStream;
  let audioContext;
  let chunks = [];
  let recordedBlob;
  let timer;
  let startedAt;
  let sendAfterStop = false;

  function initialize(value) {
    context = value;
  }

  async function startVoiceRecording() {
    if (!context?.state?.selectedConversation && !context?.state?.selectedUser) {
      return notify("Pehle koi chat select karein.", "warning");
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      return notify("Is browser mein voice recording support nahi hai.", "error");
    }

    try {
      microphoneStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      stream = microphoneStream;

      // Browser microphones can be extremely quiet. Record through a small
      // Web Audio gain/compressor chain when the API is available.
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
        if (audioContext.state === "suspended") await audioContext.resume();
        const source = audioContext.createMediaStreamSource(microphoneStream);
        const gain = audioContext.createGain();
        const compressor = audioContext.createDynamicsCompressor();
        const destination = audioContext.createMediaStreamDestination();
        gain.gain.value = 2.4;
        compressor.threshold.value = -18;
        compressor.knee.value = 18;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        source.connect(gain).connect(compressor).connect(destination);
        stream = destination.stream;
      }
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 64000 } : undefined);
      const recordingMimeType = recorder.mimeType || "audio/webm";
      chunks = [];
      recordedBlob = null;
      sendAfterStop = false;
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        recordedBlob = new Blob(chunks, { type: recordingMimeType });
        stream?.getTracks().forEach((track) => track.stop());
        microphoneStream?.getTracks().forEach((track) => track.stop());
        stream = null;
        microphoneStream = null;
        audioContext?.close().catch(() => {});
        audioContext = null;
        if (sendAfterStop) {
          sendRecordedBlob();
        } else {
          setRecorderReady();
        }
      };
      recorder.start(250);
      startedAt = Date.now();
      context.elements.voiceRecorderPanel.classList.remove("hidden");
      context.elements.voiceRecordButton.classList.add("recording");
      context.elements.sendVoiceRecordingButton.disabled = false;
      context.elements.sendVoiceRecordingButton.textContent = "Send Voice";
      updateDuration();
      timer = window.setInterval(updateDuration, 500);
      notify("Recording start ho gayi.", "success");
    } catch (error) {
      cleanup();
      notify(error.name === "NotAllowedError" ? "Microphone permission Allow karein." : "Recording start nahi ho saki.", "error");
    }
  }

  function stopVoiceRecording() {
    if (recorder?.state === "recording") recorder.stop();
    window.clearInterval(timer);
    timer = null;
  }

  function cancelVoiceRecording() {
    recorder?.state === "recording" && recorder.stop();
    cleanup();
    context.elements.voiceRecorderPanel.classList.add("hidden");
    context.elements.voiceRecordingDuration.textContent = "00:00";
    notify("Voice note cancel ho gaya.", "warning");
  }

  async function sendVoiceRecording() {
    if (recorder?.state === "recording") {
      sendAfterStop = true;
      context.elements.sendVoiceRecordingButton.disabled = true;
      context.elements.sendVoiceRecordingButton.textContent = "Sending...";
      stopVoiceRecording();
      return;
    }
    if (!recordedBlob?.size) return;

    return sendRecordedBlob();
  }

  async function sendRecordedBlob() {
    if (!recordedBlob?.size) return;

    const button = context.elements.sendVoiceRecordingButton;
    button.disabled = true;
    button.textContent = "Sending...";
    try {
      const extension = recordedBlob.type.includes("mp4") ? "m4a" : "webm";
      const voiceFile = new File(
        [recordedBlob],
        `voice-note-${Date.now()}.${extension}`,
        { type: recordedBlob.type || "audio/webm" }
      );
      await window.IDEAZ_CONVERSATION.sendMessage({
        text: "",
        attachment: voiceFile,
      });
      cleanup();
      context.elements.voiceRecorderPanel.classList.add("hidden");
      context.elements.voiceRecordingDuration.textContent = "00:00";
      notify("Voice note send ho gaya.", "success");
    } catch (error) {
      button.disabled = false;
      button.textContent = "Send Voice";
      notify(error.message || "Voice note send nahi ho saka.", "error");
    }
  }

  function setRecorderReady() {
    context.elements.voiceRecordButton.classList.remove("recording");
    context.elements.sendVoiceRecordingButton.disabled = false;
    context.elements.sendVoiceRecordingButton.textContent = "Send Voice";
  }

  function updateDuration() {
    const seconds = Math.floor((Date.now() - startedAt) / 1000);
    const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
    const remainder = String(seconds % 60).padStart(2, "0");
    context.elements.voiceRecordingDuration.textContent = `${minutes}:${remainder}`;
    if (seconds >= 120) stopVoiceRecording();
  }

  function cleanup() {
    window.clearInterval(timer);
    timer = null;
    stream?.getTracks().forEach((track) => track.stop());
    microphoneStream?.getTracks().forEach((track) => track.stop());
    stream = null;
    microphoneStream = null;
    audioContext?.close().catch(() => {});
    audioContext = null;
    recorder = null;
    chunks = [];
    recordedBlob = null;
    sendAfterStop = false;
    context?.elements?.voiceRecordButton?.classList.remove("recording");
    if (context?.elements?.sendVoiceRecordingButton) {
      context.elements.sendVoiceRecordingButton.disabled = false;
      context.elements.sendVoiceRecordingButton.textContent = "Send Voice";
    }
  }

  function notify(message, type) {
    window.IDEAZ_CHAT?.showToast(context.elements, message, type);
  }

  window.IDEAZ_UPLOADS = {
    initialize,
    startVoiceRecording,
    stopVoiceRecording,
    cancelVoiceRecording,
    sendVoiceRecording,
  };
})();
