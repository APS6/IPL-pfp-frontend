const API_URL = import.meta.env.PUBLIC_API_URL;
const imageInput = document.getElementById("imageInput");
const uploadedImagePreview = document.getElementById("uploadedImagePreview");
const previewImage = document.getElementById("previewImage");
const generateButton = document.getElementById("generateButton");
const result = document.getElementById("result");
const resultImage = document.getElementById("resultImage");
const downloadButton = document.getElementById("downloadButton");
const resetButton = document.getElementById("resetButton");
const backgroundSelector = document.getElementById("backgroundSelector");
let uploadedImage = null;
let selectedBackground = null;
let teamName = null;

document.addEventListener("DOMContentLoaded", () => {
  // Find the first background button and simulate a click
  const firstBackgroundButton = backgroundSelector.querySelector("button");
  if (firstBackgroundButton) {
    firstBackgroundButton.click();
    // Add visual indication that it's selected
    firstBackgroundButton.classList.add("ring-3", "ring-blue-600");
  }
});

imageInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    uploadedImage = file;
    previewImage.src = URL.createObjectURL(file);
    uploadedImagePreview.classList.remove("hidden");
    checkGenerateButton();
  }
});

backgroundSelector.addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (button) {
    const fullPath = button.dataset.imagePath.replace("src/assets/teams/", "");
    teamName = fullPath.split("/")[1];
    selectedBackground = fullPath.split("/").pop();
    document.querySelectorAll(".bg-selection-button").forEach((btn) => {
      btn.classList.remove("ring-3", "ring-blue-600");
    });
    button.classList.add("ring-3", "ring-blue-600");
    checkGenerateButton();
  }
});

function checkGenerateButton() {
  generateButton.disabled = !(uploadedImage && selectedBackground);
}

// Function to check if server is online
async function checkServerStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${API_URL}/`, {
      signal: controller.signal,
      method: "GET",
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error("Server status check failed:", error);
    return false;
  }
}

// Function to display error message
function showErrorMessage(message, isServerOffline = false) {
  const errorDiv = document.createElement("div");
  errorDiv.className =
    "fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-5 py-4 rounded max-w-md";
  errorDiv.setAttribute("role", "alert");

  if (isServerOffline) {
    errorDiv.innerHTML = `
      <strong class="font-bold">Server Offline! </strong>
      <span class="block sm:inline">${message}</span>
      <button class="absolute top-0 right-0 px-2 py-1" onclick="this.parentElement.remove()">✕</button>
    `;
  } else {
    errorDiv.innerHTML = `
      <strong class="font-bold">Error! </strong>
      <span class="block sm:inline">${message}</span>
      <button class="absolute top-0 right-0 px-2 py-1" onclick="this.parentElement.remove()">✕</button>
    `;
  }

  // Remove any existing error messages
  document.querySelectorAll("[role='alert']").forEach((el) => el.remove());

  document.body.appendChild(errorDiv);

  // Auto remove after 10 seconds
  setTimeout(() => {
    if (document.body.contains(errorDiv)) {
      errorDiv.remove();
    }
  }, 10000);
}

generateButton.addEventListener("click", async () => {
  if (!uploadedImage || !selectedBackground) return;

  // Show loading state
  generateButton.disabled = true;
  generateButton.textContent = "Processing...";

  // Check if server is online first
  const isServerOnline = await checkServerStatus();
  if (!isServerOnline) {
    showErrorMessage("The server is offline. Please try again later.", true);
    generateButton.disabled = false;
    generateButton.textContent = "Generate";
    return;
  }

  const formData = new FormData();
  formData.append("image", uploadedImage);
  formData.append("background", selectedBackground);
  formData.append("team", teamName);

  try {
    // Check if API_URL is defined
    if (!API_URL) {
      throw new Error(
        "API_URL is undefined. Check your environment variables.",
      );
    }

    console.log(`Making request to: ${API_URL}/api/process`);

    // Use AbortController to set a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(`${API_URL}/api/process`, {
      method: "POST",
      body: formData,
      mode: "cors",
      credentials: "same-origin",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log("Response received:", response);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the JSON response
    const data = await response.json();

    // The backend returns { result: "data:image/png;base64,..." }
    if (data && data.result) {
      resultImage.src = data.result;
      result.classList.remove("hidden");
    } else {
      throw new Error("Invalid response format from server");
    }
  } catch (error) {
    console.error("Error processing image:", error);

    if (error.name === "AbortError") {
      showErrorMessage(
        "Request timed out. The server may be overloaded or offline.",
        true,
      );
    } else if (
      error.name === "TypeError" &&
      error.message === "Failed to fetch"
    ) {
      showErrorMessage("The server is offline. Please try again later.", true);
    } else {
      showErrorMessage(`Error processing image: ${error.message}`);
    }
  } finally {
    // Reset button state
    generateButton.disabled = false;
    generateButton.textContent = "Generate";
  }
});

downloadButton.addEventListener("click", () => {
  if (!resultImage.src) return;
  const link = document.createElement("a");
  link.href = resultImage.src;
  link.download = "profile-picture.png";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

resetButton.addEventListener("click", () => {
  uploadedImage = null;
  selectedBackground = null;
  imageInput.value = "";
  uploadedImagePreview.classList.add("hidden");
  result.classList.add("hidden");
  document.querySelectorAll(".bg-selection-button").forEach((btn) => {
    btn.classList.remove("ring-2", "ring-blue-500");
  });
  generateButton.disabled = true;
});
