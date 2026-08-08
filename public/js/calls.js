(function () {
  let context;
  let socket;
  let peer;
  let localStream;
  let remoteStream;
  let activeUser;
  let activeType = "voice";
  let pendingOffer;
  let pendingCandidates = [];
  let ringContext;
  let ringTimer;
  let vibrationTimer;

  let rtcConfig = {
    iceServers: [{ urls: [
      "stun:stun.l.google.com:19302",
      "stun:stun1.l.google.com:19302",
      "stun:stun.cloudflare.com:3478",
    ] }],
    iceCandidatePoolSize: 10,
  };
  let rtcConfigPromise;
  const byId = (id) => document.getElementById(id);

  function initialize(value) {
    context = value;
    socket = window.IDEAZ_SOCKET?.getSocket();
    if (!socket) return;
    socket.on("call:offer", receiveOffer);
    socket.on("call:answer", receiveAnswer);
    socket.on("call:ice-candidate", receiveIceCandidate);
    socket.on("call:reject", () => closeCall("Call reject ho gayi."));
    socket.on("call:end", () => closeCall("Call end ho gayi."));
    byId("acceptCallButton")?.addEventListener("click", acceptCall);
    byId("rejectCallButton")?.addEventListener("click", rejectCall);
    byId("endCallButton")?.addEventListener("click", endCall);
    byId("toggleMuteButton")?.addEventListener("click", toggleMute);
    byId("toggleCameraButton")?.addEventListener("click", toggleCamera);
    byId("callOverlay")?.addEventListener("click", playRemoteMedia);
    rtcConfigPromise = loadRtcConfig();
  }

  async function loadRtcConfig() {
    try {
      const response = await fetch("/api/rtc-config", { cache: "no-store" });
      if (!response.ok) return;
      const config = await response.json();
      if (Array.isArray(config.iceServers) && config.iceServers.length) {
        rtcConfig = { ...rtcConfig, iceServers: config.iceServers };
      }
    } catch (error) {
      console.warn("RTC config unavailable; using STUN fallback.", error);
    }
  }

  async function startCall(type) {
    activeUser = context?.state?.selectedUser;
    if (!activeUser) return notify("Pehle contact select karein.", "warning");
    activeType = type;
    showOverlay(`${type === "video" ? "Video" : "Voice"} call ja rahi hai...`, false);
    startRinging(false);
    try {
      await rtcConfigPromise;
      await prepareMedia(type);
      createPeer();
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("call:offer", { targetUserId: activeUser.id, offer, type, caller: context.state.currentUser });
    } catch (error) {
      closeCall(error.name === "NotAllowedError" ? "Camera/microphone permission allow karein." : "Call start nahi ho saki.");
    }
  }

  async function receiveOffer(payload) {
    if (peer || pendingOffer) {
      socket.emit("call:reject", { targetUserId: payload.fromUserId });
      return;
    }
    pendingOffer = payload;
    activeUser = payload.caller || { id: payload.fromUserId, fullName: "Incoming caller" };
    activeType = payload.type || "voice";
    showOverlay(`Incoming ${activeType} call`, true);
    startRinging(true);
  }

  async function acceptCall() {
    if (!pendingOffer) return;
    stopRinging();
    try {
      await rtcConfigPromise;
      await prepareMedia(activeType);
      createPeer();
      localStream.getTracks().forEach((track) => peer.addTrack(track, localStream));
      await peer.setRemoteDescription(pendingOffer.offer);
      await flushPendingCandidates();
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("call:answer", { targetUserId: pendingOffer.fromUserId, answer });
      pendingOffer = null;
      showActiveControls();
      byId("callStatusText").textContent = "Connected";
    } catch (error) {
      rejectCall();
      notify("Camera/microphone permission allow karein.", "warning");
    }
  }

  async function receiveAnswer(payload) {
    if (!peer) return;
    stopRinging();
    await peer.setRemoteDescription(payload.answer);
    await flushPendingCandidates();
    showActiveControls();
    byId("callStatusText").textContent = "Connected";
  }

  async function receiveIceCandidate(payload) {
    if (!payload.candidate) return;
    if (!peer || !peer.remoteDescription) {
      pendingCandidates.push(payload.candidate);
      return;
    }
    try { await peer.addIceCandidate(payload.candidate); } catch (error) { console.error(error); }
  }

  function createPeer() {
    peer = new RTCPeerConnection(rtcConfig);
    remoteStream = new MediaStream();
    byId("remoteVideo").srcObject = remoteStream;
    peer.ontrack = (event) => {
      const incomingStream = event.streams[0];
      if (incomingStream) {
        remoteStream = incomingStream;
      } else if (!remoteStream.getTracks().some((track) => track.id === event.track.id)) {
        remoteStream.addTrack(event.track);
      }

      const remoteAudio = byId("remoteAudio");
      const remoteVideo = byId("remoteVideo");
      remoteAudio.srcObject = remoteStream;
      remoteAudio.volume = 1;
      remoteAudio.muted = false;
      remoteVideo.srcObject = remoteStream;
      playRemoteMedia().catch(() => {
        byId("callStatusText").textContent = "Speaker ke liye call screen par click karein";
      });
      if (activeType === "video") remoteVideo.play().catch(() => {});
    };
    peer.onicecandidate = (event) => {
      if (event.candidate && activeUser?.id) socket.emit("call:ice-candidate", { targetUserId: activeUser.id, candidate: event.candidate });
    };
    peer.onconnectionstatechange = () => {
      if (peer?.connectionState === "connected") {
        byId("callStatusText").textContent = "Connected";
        playRemoteMedia().catch(() => {});
      } else if (peer?.connectionState === "failed") {
        closeCall("Network call connect nahi kar saka. TURN relay check karein.");
      }
    };
    peer.oniceconnectionstatechange = () => {
      if (peer?.iceConnectionState === "disconnected") {
        byId("callStatusText").textContent = "Network dobara connect ho raha hai...";
        peer.restartIce?.();
      }
    };
  }

  async function playRemoteMedia() {
    const remoteAudio = byId("remoteAudio");
    if (remoteAudio?.srcObject) {
      remoteAudio.volume = 1;
      remoteAudio.muted = false;
      await remoteAudio.play();
    }
    const remoteVideo = byId("remoteVideo");
    if (activeType === "video" && remoteVideo?.srcObject) {
      await remoteVideo.play().catch(() => {});
    }
  }

  async function prepareMedia(type) {
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
      video: false,
    });
    localStream = new MediaStream(audioStream.getAudioTracks());

    // A denied/busy camera must not stop the call from reaching the other
    // person. Keep the video call alive with audio and still show their camera.
    if (type === "video") {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 24, max: 30 },
          },
        });
        cameraStream.getVideoTracks().forEach((track) => localStream.addTrack(track));
      } catch (error) {
        notify("Camera allow/busy hai; call audio ke saath ja rahi hai.", "warning");
      }
    }

    const localVideo = byId("localVideo");
    localVideo.srcObject = localStream;
    localVideo.classList.toggle("hidden", localStream.getVideoTracks().length === 0);
    byId("remoteVideo").classList.toggle("hidden", type !== "video");
  }

  function showOverlay(status, incoming) {
    byId("callOverlay").classList.remove("hidden");
    byId("callContactName").textContent = activeUser?.fullName || activeUser?.username || "Contact";
    byId("callAvatar").textContent = (activeUser?.fullName || "C").slice(0, 2).toUpperCase();
    byId("callStatusText").textContent = status;
    byId("incomingCallActions").classList.toggle("hidden", !incoming);
    byId("activeCallActions").classList.toggle("hidden", incoming);
    byId("toggleCameraButton").classList.toggle("hidden", activeType !== "video");
  }

  function showActiveControls() {
    byId("incomingCallActions").classList.add("hidden");
    byId("activeCallActions").classList.remove("hidden");
  }

  function rejectCall() {
    if (pendingOffer) socket.emit("call:reject", { targetUserId: pendingOffer.fromUserId });
    closeCall("Call reject kar di.");
  }

  function endCall() {
    if (activeUser?.id) socket.emit("call:end", { targetUserId: activeUser.id });
    closeCall("Call end ho gayi.");
  }

  function closeCall(message) {
    stopRinging();
    localStream?.getTracks().forEach((track) => track.stop());
    peer?.close();
    peer = null; localStream = null; remoteStream = null; pendingOffer = null; pendingCandidates = [];
    ["localVideo", "remoteVideo"].forEach((id) => { const video = byId(id); if (video) video.srcObject = null; });
    const remoteAudio = byId("remoteAudio");
    if (remoteAudio) remoteAudio.srcObject = null;
    byId("callOverlay")?.classList.add("hidden");
    if (message) notify(message, "warning");
  }

  function toggleMute(event) {
    const track = localStream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    event.currentTarget.classList.toggle("off", !track.enabled);
  }

  function toggleCamera(event) {
    const track = localStream?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    event.currentTarget.classList.toggle("off", !track.enabled);
  }

  function notify(message, type) {
    window.IDEAZ_CHAT?.showToast(context.elements, message, type);
  }

  async function flushPendingCandidates() {
    if (!peer?.remoteDescription) return;
    const candidates = pendingCandidates.splice(0);
    for (const candidate of candidates) {
      try { await peer.addIceCandidate(candidate); } catch (error) { console.error(error); }
    }
  }

  function startRinging(incoming) {
    stopRinging();

    const playTone = () => {
      try {
        ringContext = ringContext || new (window.AudioContext || window.webkitAudioContext)();
        if (ringContext.state === "suspended") ringContext.resume().catch(() => {});

        const now = ringContext.currentTime;
        const bursts = incoming
          ? [{ start: 0, length: 0.42 }, { start: 0.62, length: 0.42 }]
          : [{ start: 0, length: 0.7 }];
        const frequencies = incoming ? [480, 620] : [440, 480];

        bursts.forEach((burst) => {
          frequencies.forEach((frequency) => {
            const oscillator = ringContext.createOscillator();
            const gain = ringContext.createGain();
            const start = now + burst.start;
            const end = start + burst.length;

            oscillator.type = incoming ? "square" : "sine";
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(incoming ? 0.24 : 0.13, start + 0.025);
            gain.gain.setValueAtTime(incoming ? 0.24 : 0.13, end - 0.035);
            gain.gain.exponentialRampToValueAtTime(0.0001, end);
            oscillator.connect(gain).connect(ringContext.destination);
            oscillator.start(start);
            oscillator.stop(end + 0.02);
          });
        });
      } catch (error) {
        console.warn("Ringtone unavailable:", error);
      }
    };

    playTone();
    ringTimer = window.setInterval(playTone, incoming ? 2600 : 3000);

    if (incoming && navigator.vibrate) {
      const vibrate = () => navigator.vibrate([450, 250, 450, 900]);
      vibrate();
      vibrationTimer = window.setInterval(vibrate, 2100);
    }
  }

  function stopRinging() {
    if (ringTimer) window.clearInterval(ringTimer);
    if (vibrationTimer) window.clearInterval(vibrationTimer);
    ringTimer = null;
    vibrationTimer = null;
    if (navigator.vibrate) navigator.vibrate(0);
  }

  window.IDEAZ_CALLS = { initialize, startCall };
})();
