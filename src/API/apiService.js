import { API_HOST } from "../API/apiConfig";

/**
 * Function to call GET API
 * @param {string} endpoint - The API endpoint
 * @param {object} headers - Optional headers
 * @returns {Promise<object>} - API response
 */
export const getRequest = async (endpoint, headers = {}) => {
  try {
    let token;
    if (localStorage.tokenKey) {
      token = { Authorization: `Bearer ${localStorage.getItem("tokenKey")}` };
    } else {
      token = { Authorization: `Bearer ${sessionStorage.getItem("tokenKey")}` };
    }
    const response = await fetch(`${API_HOST}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...token,
        ...headers,
      },
    });
    if (!response.ok) {
      throw new Error(`GET request failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("GET Error:", error);
    throw error;
  }
};



export const getImageRequest = async (endpoint, headers = {}, responseType = "json") => {
  try {
    let token;
    if (localStorage.tokenKey) {
      token = { Authorization: `Bearer ${localStorage.getItem("tokenKey")}` };
    } else {
      token = { Authorization: `Bearer ${sessionStorage.getItem("tokenKey")}` };
    }

    const response = await fetch(`${API_HOST}${endpoint}`, {
      method: "GET",
      headers: {
        ...(responseType === "json" && { "Content-Type": "application/json" }),
        ...token,
        ...headers,
      },
    });

    if (!response.ok) {
      throw new Error(`GET request failed: ${response.status}`);
    }

    switch (responseType) {
      case "blob":
        return await response.blob();
      case "text":
        return await response.text();
      case "json":
      default:
        return await response.json();
    }
  } catch (error) {
    console.error("GET Error:", error);
    throw error;
  }
};


/**
 * Function to call POST API
 * @param {string} endpoint - The API endpoint
 * @param {object} data - Request body
 * @param {object} headers - Optional headers
 * @returns {Promise<object>} - API response
 */
export const postRequest = async (endpoint, data, headers = {}) => {
  try {
    let token;
    if (localStorage.tokenKey) {
      token = { Authorization: `Bearer ${localStorage.getItem("tokenKey")}` };
    } else {
      token = { Authorization: `Bearer ${sessionStorage.getItem("tokenKey")}` };
    }
    const response = await fetch(`${API_HOST}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...token,
        ...headers,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`POST request failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("POST Error:", error);
    throw error;
  }
};



/**
 * Function to call POST API with FormData
 * @param {string} endpoint - The API endpoint
 * @param {FormData} formData - FormData object
 * @returns {Promise<object>} - API response
 */
export const postRequestWithFormData = async (endpoint, formData) => {
  try {
    let token = localStorage.getItem("tokenKey") || sessionStorage.getItem("tokenKey");

    console.log(`Sending request to: ${API_HOST}${endpoint}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${API_HOST}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,  // ✅ Keep only this
      },
      body: formData,  // ✅ Browser sets Content-Type automatically
    });
    

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server response:", errorText);
      throw new Error(`POST request failed: ${response.status} - ${errorText || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("POST Error:", error);

    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please check your network connection and try again.");
    } else if (error.message.includes("Failed to fetch")) {
      throw new Error("Network connection error. Please check if the server is running and accessible.");
    }

    throw error;
  }
};



/**
 * Function to call PUT API
 * @param {string} endpoint - The API endpoint
 * @param {object} data - Request body
 * @param {object} headers - Optional headers
 * @returns {Promise<object>} - API response
 */
export const putRequest = async (endpoint, data, headers = {}) => {
  try {
    let token;
    if (localStorage.tokenKey) {
      token = { Authorization: `Bearer ${localStorage.getItem("tokenKey")}` };
    } else {
      token = { Authorization: `Bearer ${sessionStorage.getItem("tokenKey")}` };
    }
    const response = await fetch(`${API_HOST}${endpoint}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...token,
        ...headers,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`PUT request failed: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("PUT Error:", error);
    throw error;
  }
};

/**
 * Function to call PATCH API
 * @param {string} endpoint - The API endpoint
 * @param {object} data - Request body
 * @param {object} headers - Optional headers
 * @param {object} params - Optional query parameters
 * @returns {Promise<object>} - API response
 */
export const patchRequest = async (endpoint, data = null, headers = {}, params = {}) => {
  try {
    let token;
    if (localStorage.tokenKey) {
      token = { Authorization: `Bearer ${localStorage.getItem("tokenKey")}` };
    } else {
      token = { Authorization: `Bearer ${sessionStorage.getItem("tokenKey")}` };
    }
    
    // Build URL with query parameters
    let url = `${API_HOST}${endpoint}`;
    if (Object.keys(params).length > 0) {
      const queryParams = new URLSearchParams(params);
      url += `?${queryParams.toString()}`;
    }
    
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...token,
        ...headers,
      },
      body: data ? JSON.stringify(data) : null,
    });
    
    if (!response.ok) {
      throw new Error(`PATCH request failed: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("PATCH Error:", error);
    throw error;
  }
};


const uploadFileWithJson = async (endpoint, jsonData, files) => {
  if (!files || !(files instanceof FileList || files instanceof File)) {
    throw new Error("No valid file provided!");
  }

  let token = localStorage.tokenKey
    ? { Authorization: `Bearer ${localStorage.getItem("tokenKey")}` }
    : { Authorization: `Bearer ${sessionStorage.getItem("tokenKey")}` };

  const formData = new FormData();
  formData.append(
    "json",
    new Blob([JSON.stringify(jsonData)], { type: "application/json" })
  );

  // Add the file (only the first file if it's a FileList)
  if (files instanceof FileList) {
    formData.append("files", files[0]); // Backend expects a single file
  } else {
    formData.append("files", files); // Single file
  }

  try {
    const response = await fetch(`${API_HOST}${endpoint}`, {
      method: "POST",
      headers: { ...token },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error during file upload:", error.message);
    throw error;
  }
};
export { uploadFileWithJson };


const updateFileWithJson = async (endpoint, jsonData, files) => {

  let token = localStorage.tokenKey
    ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
    : { Authorization: `Bearer ${sessionStorage.getItem("token")}` };

  const formData = new FormData();
  formData.append(
    "json",
    new Blob([JSON.stringify(jsonData)], { type: "application/json" })
  );

  if (files instanceof FileList) {
    formData.append("files", files[0]); 
  } else {
    formData.append("files", files); 
  }

  try {
    const response = await fetch(`${API_HOST}${endpoint}`, {
      method: "PUT", 
      headers: { ...token },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error during file upload:", error.message);
    throw error;
  }
};
export { updateFileWithJson };



async function uploadMultiFileWithJson(endpoint, jsonData, files1, files2) {
  let token;
  if (localStorage.tokenKey) {
    token = { Authorization: `Bearer ${localStorage.getItem("tokenKey")}` };
  } else {
    token = { Authorization: `Bearer ${sessionStorage.getItem("tokenKey")}` };
  }

  const formData = new FormData();
  formData.append(
    "json",
    new Blob([JSON.stringify(jsonData)], { type: "application/json" })
  );
  formData.append(`bannerImage`, files1);
  formData.append(`thumbImage`, files2);

  try {
    const response = await fetch(`${API_HOST}${endpoint}`, {
      method: "POST",
      headers: {
        ...token,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error during file upload:", error.message);
    throw error;
  }
}


export { uploadMultiFileWithJson };



async function updateMultiFileWithJson(endpoint, jsonData, files1, files2) {
  let token;
  if (localStorage.tokenKey) {
    token = { Authorization: `Bearer ${localStorage.getItem("tokenKey")}` };
  } else {
    token = { Authorization: `Bearer ${sessionStorage.getItem("tokenKey")}` };
  }

  const formData = new FormData();
  formData.append(
    "json",
    new Blob([JSON.stringify(jsonData)], { type: "application/json" })
  );
  if (files1) {
    formData.append("bannerImage", files1);
  }
  if (files2) {
    formData.append("thumbImage", files2);
  }

  try {
    const response = await fetch(`${API_HOST}${endpoint}`, {
      method: "PUT", // Use PUT or PATCH based on your API
      headers: {
        ...token,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error during file update:", error.message);
    throw error;
  }
}
export { updateMultiFileWithJson };
