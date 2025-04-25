
// Base64-encoded small sound similar to iMessage
const MESSAGE_SOUND_BASE64 = "data:audio/mp3;base64,SUQzAwAAAAAAI1RJVDIAAAAZAAAAaU1lc3NhZ2Ugbm90aWZpY2F0aW9uAAD/+5DEAAAJCALBMQAAIAmAWCYgAAQAEkxBTUUzLjEwMAOAJAAAABRgJAL/Sf/2////////9U/9JrJOMS9GJPIhEIhCbCvVaoEFTiEQ+AIBAgQDGKiynHAxRJxyCjbIEI///+OU5UIQgxCiZGOQTjkCHAH///5CEJ8c5ziHOc5znP////znOOc5znOQIQn//8hCDgAAD4fD4IQQQQQQT/4QQQ+CED4IQQQfggggghBBD4IIIP///gg+D4IIPgggh8Hx8H//B8EEEH//B///wff//B8H/wQQiEIhEJGMY5jH////////jGMYx//GMYxEIhEIhEJGP////GMYxjGMYxjGP/////////jGMYxjGMf////GMYhEIhEIhEIhEIRCIQiEQhEIhEIhEIRCIRCIRCIRCEQiEQiEQiEQiEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQhCEIQRBEEQRBEEQRBEEQRBEEQRBEEQRBEEQRBEIRBEEQRBEEQRBEEQRBEEQjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxj/+5DEMIPAAAGkHAAAIAAANIAAAARjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGMYxjGM";

// Create an Audio element when the module loads
let audio: HTMLAudioElement | null = null;

// Initialize the audio element (called on user interaction to comply with browser autoplay policies)
export const initAudio = (): void => {
  if (!audio) {
    audio = new Audio(MESSAGE_SOUND_BASE64);
    audio.volume = 0.3; // Adjust volume to 30%
  }
};

// Play the message notification sound
export const playMessageSound = (): void => {
  if (!audio) {
    initAudio();
  }
  
  // Clone and play to allow overlapping sounds
  if (audio) {
    const clone = audio.cloneNode() as HTMLAudioElement;
    clone.play().catch(err => console.error("Failed to play notification sound:", err));
  }
};
