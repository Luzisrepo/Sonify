import { Pane, FolderApi } from "https://cdn.skypack.dev/tweakpane@4.0.4";
// https://codepen.io/luis-lessrain/pen/NPWbvKN
const TweakpaneUtils = {
    /**
     * Append elements to the correct folder content area inside Tweakpane.
     */
    appendToFolderContent(folder, elements) {
        const checkAndAppend = () => {
            const folderContent = folder.element.querySelector(".tp-fldv_c");
            if (!folderContent) return false;

            (Array.isArray(elements) ? elements : [elements]).forEach((el) => {
                if (!folderContent.contains(el)) {
                    folderContent.appendChild(el);
                }
            });

            return true;
        };

        if (checkAndAppend()) return;

        const observer = new MutationObserver(() => {
            if (checkAndAppend()) {
                observer.disconnect();
            }
        });

        observer.observe(folder.element, { childList: true, subtree: true });
    },

    /**
     * Add an image uploader inside Tweakpane.
     */
    addImageUploader(container, onImageUpload, options = {}) {
        const {
            allowedUploadTypes = ["image/png", "image/jpeg", "image/webp"],
                buttonOptions = { title: "Upload Image" },
                onButtonClick = null
        } = options;

        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = allowedUploadTypes.join(",");
        fileInput.style.display = "none";

        fileInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (!file) return;
            if (!allowedUploadTypes.includes(file.type))
                return console.error(`Unsupported file type: ${file.type}`);

            const reader = new FileReader();
            reader.onload = (e) => onImageUpload(e.target.result);
            reader.readAsDataURL(file);
        });

        const uploadButton = container.addButton(buttonOptions);
        uploadButton.on("click", () => {
            if (typeof onButtonClick === "function") onButtonClick();
            fileInput.click();
        });

        container instanceof FolderApi ? TweakpaneUtils.appendToFolderContent(container, fileInput) : container.element.appendChild(fileInput);

        return { button: uploadButton, fileInput };
    },

    /**
     * Add Demo Images Folder
     */
    addDemoImages(pane, onImageLoad, options = {}) {
        const {
            baseURL = "https://www.lessrain.com/dev/images/lr-demo-img-",
                totalImages = 370,
                fixedFirstImage = 23,
                thumbnailClass = "tp-demo-thumbnails",
                folderOptions = { title: "Demo Images" },
                thumbnailExtensions = ["png"],
                imageExtensions = ["jpg", "webp", "png"],
                onThumbnailClick = null
        } = options;

        const demoFolder = pane.addFolder(folderOptions);
        const thumbnailContainer = document.createElement("div");
        thumbnailContainer.classList.add(thumbnailClass);
        let demoImageIds = [];

        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }

        async function tryImageExtensions(baseUrl, extensions) {
            for (const ext of extensions) {
                const url = `${baseUrl}.${ext}`;
                const img = new Image();
                img.src = url;
                img.crossOrigin = "Anonymous";

                const isValid = await new Promise((resolve) => {
                    img.onload = () => resolve(true);
                    img.onerror = () => resolve(false);
                });

                if (isValid) return url;
            }
            return null;
        }

        function generateThumbnails() {
            const allImageIds = Array.from({ length: totalImages },
                (_, i) => i + 1
            ).filter((num) => num !== fixedFirstImage);
            shuffleArray(allImageIds);
            demoImageIds = [fixedFirstImage, ...allImageIds.slice(0, 19)];

            while (thumbnailContainer.children.length < demoImageIds.length) {
                const thumbnailWrapper = document.createElement("div");
                thumbnailWrapper.classList.add("tp-demo-thumbnail");

                const thumbnailImg = document.createElement("img");
                thumbnailWrapper.appendChild(thumbnailImg);
                thumbnailContainer.appendChild(thumbnailWrapper);
            }

            while (thumbnailContainer.children.length > demoImageIds.length) {
                thumbnailContainer.removeChild(thumbnailContainer.lastChild);
            }

            Array.from(thumbnailContainer.children).forEach(
                async (thumbnailWrapper, index) => {
                    const id = demoImageIds[index];
                    const name = `Image ${id}`;
                    const baseUrl = `${baseURL}${id}`;
                    const thumbnailUrl = await tryImageExtensions(
                        `${baseUrl}-thumb`,
                        thumbnailExtensions
                    );

                    if (!thumbnailUrl) return;

                    const thumbnailImg = thumbnailWrapper.querySelector("img");
                    thumbnailImg.src = thumbnailUrl;
                    thumbnailImg.alt = name;

                    thumbnailWrapper.replaceWith(thumbnailWrapper.cloneNode(true));
                    const updatedWrapper = thumbnailContainer.children[index];

                    updatedWrapper.addEventListener("click", async () => {
                        if (typeof onThumbnailClick === "function") {
                            onThumbnailClick(name, baseUrl);
                        }

                        const imageUrl = await tryImageExtensions(baseUrl, imageExtensions);
                        if (imageUrl) {
                            onImageLoad(imageUrl);
                        } else {
                            console.error(`Failed to load image: ${baseUrl}`);
                        }
                    });
                }
            );
        }

        function getImageList() {
            return demoImageIds.map((id) => `${baseURL}${id}`);
        }

        function loadImageIndex(index) {
            if (index < 0 || index >= demoImageIds.length) {
                console.warn(`Invalid index: ${index}`);
                return;
            }

            const baseUrl = `${baseURL}${demoImageIds[index]}`;

            tryImageExtensions(baseUrl, imageExtensions).then((imageUrl) => {
                if (imageUrl) {
                    onImageLoad(imageUrl);
                } else {
                    console.error(`Failed to load image: ${baseUrl}`);
                }
            });
        }

        demoFolder.addButton({ title: "Reload Thumbnails" }).on("click", generateThumbnails);
        generateThumbnails();

        TweakpaneUtils.appendToFolderContent(demoFolder, thumbnailContainer);

        return { folder: demoFolder, getImageList, loadImageIndex };
    },

    /**
     * Enable or disable all controls inside a Tweakpane instance.
     */
    setEnabled(pane, isEnabled) {
        pane.children.forEach((control) => {
            if (control.disabled !== undefined) {
                control.disabled = !isEnabled;
            }
        });

        pane.element.querySelectorAll(".tp-fldv, .tp-fldv_c").forEach((folder) => {
            folder.style.pointerEvents = isEnabled ? "auto" : "none";
            folder.style.opacity = isEnabled ? "1" : "0.75";
        });

        pane.element.querySelectorAll("button").forEach((button) => {
            button.disabled = !isEnabled;
        });

        // Disable all inputs
        pane.element.querySelectorAll("input, select").forEach((input) => {
            input.disabled = !isEnabled;
        });
    }
};

document.addEventListener("DOMContentLoaded", () => {

    // ========== 1. INITIAL SETUP ==========

    const pane = new Pane(); // Tweakpane UI Controller

    // Canvas Setup
    const canvas = document.getElementById("output");
    const ctx = canvas.getContext("2d");

    // Temporary Canvas for Processing
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    // Global State Variables
    let originalImage, imageData, imgWidth, imgHeight, playing;

    // Constants
    const MAX_PLAYABLE_SIZE = 24; // Maximum image size for processing
    const MAX_NOTE_DURATION = 2.0; // Maximum duration of a note in seconds

    // ========== 2. SCALE MAPPING ==========
    // Musical scales available in the app.
    // Convert hue values from the image into corresponding sound frequencies.

    const scales = {
        Major: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25], // C D E G A C
        Minor: [261.63, 293.66, 311.13, 392.0, 415.3, 523.25], // C D D# G G# C
        Pentatonic: [261.63, 293.66, 349.23, 392.0, 466.16, 523.25], // C D F G A# C
        Blues: [261.63, 293.66, 311.13, 349.23, 392.0, 466.16, 523.25], // C D D# F G A# C
        Chromatic: [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.0, 415.3, 440.0, 466.16, 493.88, 523.25], // All notes in C
        WholeTone: [261.63, 293.66, 329.63, 369.99, 415.3, 466.16, 523.25] // Whole tone steps
    };

    // Convert a hue value (0-360) into a frequency based on the selected scale.
    const hueToScaleFreqOld = (hue) => {
        const scale = scales[params.scale] || scales.Major;
        return scale[Math.floor((hue / 360) * scale.length) % scale.length];
    };

    const hueToScaleFreq = (hue, lightness) => {
        const scale = scales[params.scale] || scales.Major; // Fixed user-selected scale

        // Use square root mapping for a more natural note spread
        const noteIndex = Math.floor(Math.sqrt(hue / 360) * scale.length) % scale.length;
        let baseFreq = scale[noteIndex] || 261.63; // Default to Middle C if undefined

        // Restrict octave shifts (-1 to +2) for more controlled variation
        const octaveShift = Math.floor((lightness / 100) * 3) - 1; // Range: -1 to +2
        baseFreq *= Math.pow(2, octaveShift);

        if (!isFinite(baseFreq) || baseFreq <= 0) {
            console.warn(`Invalid frequency calculated: ${baseFreq}, using fallback.`);
            baseFreq = 261.63; // Fallback to Middle C
        }

        // Reduce microtonal variation to be more subtle (±5 Hz)
        const randomPitchOffset = (Math.random() - 0.5) * 5; // Small natural detuning
        baseFreq += randomPitchOffset;

        // Introduce a harmonic overtone (optional 5th or octave layer)
        if (Math.random() > 0.5) {
            baseFreq *= (Math.random() > 0.5 ? 1.5 : 2); // 50% chance to add a 5th or an octave
        }

        return baseFreq;
    };

    // ========== 3. COLOR CONVERSION ==========
    // https://codepen.io/luis-lessrain/pen/XJWdaZW

    const computeHue = (r, g, b, max, delta) => {
        let h = 0;
        if (delta !== 0) {
            if (max === r) h = ((g - b) / delta) % 6;
            else if (max === g) h = (b - r) / delta + 2;
            else if (max === b) h = (r - g) / delta + 4;

            h *= 60;
            if (h < 0) h += 360;
        }
        return parseFloat(h.toFixed(2));
    };

    const rgbToHsl = (r, g, b) => {
        (r /= 255), (g /= 255), (b /= 255);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;

        let h = computeHue(r, g, b, max, delta);
        let l = (max + min) / 2;
        let s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

        return [h, parseFloat((s * 100).toFixed(2)), parseFloat((l * 100).toFixed(2))];
    };

    // ========== 4. AUDIO CONTROLS ==========

    const params = {
        play: false,
        volume: 1, // Volume (0.0 - 1.0)
        bpm: 160,
        speed: 0.5, // Playback speed modifier
        pixelStep: 1, // Steps for pixel processing
        oscillatorType: "sawtooth", // Default waveform type
        scale: "Major" // Default musical scale
    };

    // Compute initial note duration based on BPM and speed
    let note_duration = Math.min((60 / params.bpm) * params.speed, MAX_NOTE_DURATION);

    const togglePlayback = () => (params.play ? startPlayback() : stopPlayback());

    // ========== 5. UI PANEL SETUP ==========
    const audioFolder = pane.addFolder({ title: "Controls" });

    audioFolder.addBinding(params, "play", { label: "Play/Stop" }).on("change", togglePlayback);
    audioFolder.addBinding(params, "volume", { label: "Volume", min: 0.0, max: 1.0, step: 0.1 });
    audioFolder.addBinding(params, "bpm", { label: "BPM", min: 40, max: 240, step: 1 }).on("change", () => {
        note_duration = Math.min((60 / params.bpm) * params.speed, MAX_NOTE_DURATION);
    });
    audioFolder.addBinding(params, "speed", { label: "Speed", min: 0.1, max: 2.0, step: 0.1 }).on("change", () => {
        note_duration = Math.min((60 / params.bpm) * params.speed, MAX_NOTE_DURATION);
    });
    audioFolder.addBinding(params, "oscillatorType", {
        label: "Oscillator Type",
        options: { Sine: "sine", Square: "square", Sawtooth: "sawtooth", Triangle: "triangle" }
    });
    audioFolder.addBinding(params, "scale", {
        label: "Scale",
        options: { Major: "Major", Minor: "Minor", Pentatonic: "Pentatonic", Blues: "Blues", Chromatic: "Chromatic", "Whole Tone": "WholeTone" }
    });

    // ========== 6. IMAGE UPLOADER ==========
    const userFolder = pane.addFolder({ title: "User Images", expanded: true });

    TweakpaneUtils.addImageUploader(
        userFolder,
        (uploadedImage) => {
            //console.log("Image Uploaded:", uploadedImage);
            loadImage(uploadedImage);
        }, {
            onButtonClick: () => {
                //console.log("File picker opened...");
            }
        }
    );

    // ========== 7. DEMO IMAGES ==========
    const demoImages = TweakpaneUtils.addDemoImages(pane, (image) => {
        //console.log("Demo Image Loaded:", image);
        loadImage(image);
    }, {
        baseURL: "https://www.lessrain.com/dev/images/lr-demo-img-",
        totalImages: 428,
        fixedFirstImage: 220,
        thumbnailClass: "tp-demo-thumbnails",
        thumbnailExtensions: ["png"],
        imageExtensions: ["jpg", "webp", "png"],
        folderOptions: { title: "Demo Images", expanded: false },
        onThumbnailClick: (name, url) => {
            //console.log(`Thumbnail Clicked: ${name} (Preparing to load ${url})`);
        }
    });

    // ========== 8. IMAGE PROCESSING ==========
    const loadImage = async (imageSource) => {
        stopPlayback();

        await new Promise((resolve) => setTimeout(resolve, 100));

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageSource;
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const originalWidth = img.width;
            const originalHeight = img.height;

            canvas.style.maxWidth = `${originalWidth*0.75}px`;
            canvas.style.maxHeight = `${originalHeight*0.75}px`;

            const scaleFactor = Math.min(MAX_PLAYABLE_SIZE / img.width, MAX_PLAYABLE_SIZE / img.height, 1);
            imgWidth = Math.round(img.width * scaleFactor);
            imgHeight = Math.round(img.height * scaleFactor);

            originalImage = img;

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);

            tempCanvas.width = imgWidth;
            tempCanvas.height = imgHeight;
            tempCtx.drawImage(img, 0, 0, imgWidth, imgHeight);
            imageData = tempCtx.getImageData(0, 0, imgWidth, imgHeight).data;
            pane.refresh();

            reset();
            startPlayback();

        };
    };

    const playImage = () => {
        if (!originalImage) return;

        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);

        let startTime = audioCtx.currentTime;
        let x = 0,
            y = 0;

        const processPixel = () => {
            if (!params.play || y >= imgHeight) {
                stopPlayback();
                return;
            }

            const index = (y * imgWidth + x) * 4;
            if (index >= imageData.length) {
                stopPlayback();
                return;
            }

            const r = imageData[index] || 0;
            const g = imageData[index + 1] || 0;
            const b = imageData[index + 2] || 0;
            const [hue, _, lightness] = rgbToHsl(r, g, b);
            const freq = hueToScaleFreq(hue, lightness);

            const minGain = 0.3;
            const pixelVolume = Math.max(minGain, 0.6 + lightness / 100); // Keeps per-pixel expressiveness

            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            const masterGain = audioCtx.createGain(); // Global user volume control

            oscillator.type = params.oscillatorType;

            // Slight pitch variation for natural sound
            const randomOffset = (Math.random() - 0.5) * 0.2;
            oscillator.frequency.setValueAtTime(freq + randomOffset, audioCtx.currentTime);

            oscillator.connect(gainNode);
            gainNode.connect(masterGain); // Route all sound through master gain
            masterGain.connect(audioCtx.destination);

            const userVolume = Math.pow(params.volume, 2); // Perceptual loudness scaling
            masterGain.gain.setValueAtTime(userVolume, audioCtx.currentTime);

            const vibratoOsc = audioCtx.createOscillator();
            const vibratoGain = audioCtx.createGain();
            vibratoOsc.frequency.setValueAtTime(3 + (lightness / 60), audioCtx.currentTime);
            vibratoGain.gain.setValueAtTime(Math.max(0.1, lightness / 100), audioCtx.currentTime);
            vibratoOsc.connect(vibratoGain);
            vibratoGain.connect(oscillator.frequency);
            vibratoOsc.start(audioCtx.currentTime);
            vibratoOsc.stop(audioCtx.currentTime + note_duration);

            const tremoloOsc = audioCtx.createOscillator();
            const tremoloGain = audioCtx.createGain();
            tremoloOsc.frequency.setValueAtTime(3 + (lightness / 50), audioCtx.currentTime);
            tremoloGain.gain.setValueAtTime(Math.max(0.1, lightness / 250), audioCtx.currentTime);
            tremoloOsc.connect(tremoloGain);
            tremoloGain.connect(gainNode.gain);
            tremoloOsc.start(audioCtx.currentTime);
            tremoloOsc.stop(audioCtx.currentTime + note_duration);

            const filter = audioCtx.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(800 + lightness * 50, audioCtx.currentTime);
            oscillator.connect(filter);
            filter.connect(gainNode);

            const reverbGain = audioCtx.createGain();
            reverbGain.gain.setValueAtTime(0.4 + lightness / 200, audioCtx.currentTime);
            gainNode.connect(reverbGain).connect(masterGain); // Ensure it passes through master volume

            const bassBoost = audioCtx.createBiquadFilter();
            bassBoost.type = "lowshelf";
            bassBoost.frequency.setValueAtTime(200, audioCtx.currentTime);
            bassBoost.gain.setValueAtTime(10 - lightness / 20, audioCtx.currentTime);
            gainNode.connect(bassBoost).connect(masterGain); // Ensure it passes through master volume
            const now = audioCtx.currentTime;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(pixelVolume, now + 0.02);
            gainNode.gain.linearRampToValueAtTime(pixelVolume * 0.8, now + note_duration * 0.5);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + note_duration);

            oscillator.start(now);
            oscillator.stop(now + note_duration + 0.1);

            const drawTime = (now - audioCtx.currentTime) * 1000;
            const timeoutId = setTimeout(() => {
                if (params.play) {
                    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
                    ctx.fillRect(
                        x * (canvas.width / imgWidth),
                        y * (canvas.height / imgHeight),
                        canvas.width / imgWidth,
                        canvas.height / imgHeight
                    );

                    ctx.strokeStyle = "#f6f2f0";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(
                        x * (canvas.width / imgWidth),
                        y * (canvas.height / imgHeight),
                        canvas.width / imgWidth,
                        canvas.height / imgHeight
                    );
                }
            }, drawTime);
            activeTimeouts.push(timeoutId);

            setTimeout(() => {
                if (!params.play) return;

                x += params.pixelStep;
                if (x >= imgWidth) {
                    x = 0;
                    y++;
                }

                processPixel();
            }, note_duration * 1000);
        };

        setTimeout(() => {
            processPixel();
        }, 350);
    };

    // ========== 9. AUDIO  ==========

    let audioCtx;
    let activeOscillators = [];
    let animationFrameId = null;
    let activeTimeouts = [];

    const createAlert = (options) => {
        const defaults = {
            message: "This is an alert!",
            buttonText: "OK",
            className: "custom-alert",
            buttonCallback: null
        };

        const { message, buttonText, className, buttonCallback } = { ...defaults, ...options };

        const fragment = document.createDocumentFragment();
        const alert = document.createElement("div");
        alert.className = `alert-box ${className}`;

        const content = document.createElement("div");
        content.className = "alert-content";

        const text = document.createElement("p");
        text.innerHTML = message;

        const button = document.createElement("button");
        button.className = "button";
        button.innerHTML = `<span class="text">${buttonText}</span>`;

        content.appendChild(text);
        content.appendChild(button);
        alert.appendChild(content);
        fragment.appendChild(alert);

        alert.addEventListener("animationend", () => {
            alert.style.transform = "translate(-50%, -50%)";
        });

        const closeAlert = () => {
            alert.classList.add("out");
            button.removeEventListener("click", closeAlert);
            setTimeout(() => document.body.removeChild(alert), 200);
            if (typeof buttonCallback === "function") buttonCallback();
        };

        button.addEventListener("click", closeAlert);
        document.body.appendChild(fragment);
        button.focus();
    };

    // https://codepen.io/luis-lessrain/pen/emYZqzx
    const handleAudioCtxStart = (autoStart, callback) => {
        if (!audioCtx) {
            audioCtx = new(window.AudioContext || window.webkitAudioContext)();
        }

        let playingInitialized = false; // Prevents multiple executions

        if (autoStart) {
            if (audioCtx.state === "suspended") {
                console.log("AudioContext is suspended. Trying to resume...");

                audioCtx.resume().then(() => {
                    if (!playingInitialized && audioCtx.state === "running") {
                        console.log("AudioContext resumed successfully. Starting playback.");
                        playingInitialized = true;
                        if (typeof callback === "function") {
                            callback();
                        }
                    }
                }).catch((error) => {
                    console.error("AudioContext.resume() blocked:", error);
                });
            }

            const timeoutId = setTimeout(() => {
                clearTimeout(timeoutId);
                if (!playingInitialized) {
                    if (audioCtx.state === "suspended") {
                        console.warn("AudioContext is STILL suspended! Autoplay is blocked.");
                        TweakpaneUtils.setEnabled(pane, false);
                        createAlert({
                            message: "🔊 Autoplay was blocked by your browser.<br>Click OK to start the audio.",
                            buttonText: "OK",
                            className: "audio-blocked",
                            buttonCallback: () => {
                                if (audioCtx.state === "suspended") {
                                    audioCtx.resume().then(() => console.log("AudioContext resumed."));
                                }
                                if (!playingInitialized && typeof callback === "function") {
                                    playingInitialized = true;
                                    TweakpaneUtils.setEnabled(pane, true);
                                    callback();
                                }
                            }
                        });
                    } else {
                        console.log("AudioContext resumed successfully. Starting playback.");
                        if (!playingInitialized && typeof callback === "function") {
                            playingInitialized = true;
                            callback();
                        }
                    }
                }
            }, 300);
        } else {
            if (!playingInitialized && typeof callback === "function") {
                playingInitialized = true;
                callback();
            }
        }
    };

    const reset = () => {
        if (!originalImage) return;
        playing = params.play = false;
        pane.refresh();
        activeOscillators.forEach((osc) => osc.stop());
        activeOscillators = [];
        activeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
        activeTimeouts = [];
        ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    };

    const startPlayback = () => {
        if (playing) return;
        handleAudioCtxStart(true, () => {
            playing = params.play = true;
            pane.refresh();
            playImage();
        });
    };

    const stopPlayback = () => {
        if (!playing) return;
        reset();
        note_duration = Math.min((60 / params.bpm) * params.speed, MAX_NOTE_DURATION);
    };
	
	const isCodePen = document.referrer.includes("codepen.io");
	const hostDomains = isCodePen ? ["codepen.io"] : [];
	hostDomains.push(window.location.hostname);

	const links = document.getElementsByTagName("a");
	LR.utils.urlUtils.validateLinks(links, hostDomains);

    demoImages.loadImageIndex(0);

});