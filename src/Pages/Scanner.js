import { useState } from "react";
import { SCAN_API } from '../API/apiConfig';
import Layout from "../Components/Layout";

const Scanner = () => {
  const [scanStatus, setScanStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState("");
  const [scanType, setScanType] = useState("oneByOne");
  const [fileName, setFileName] = useState("");
  const token = localStorage.getItem("tokenKey");

const handleScan = async () => {
  if (!totalPages || totalPages <= 0) {
    setScanStatus("❗ Please enter a valid number of total pages.");
    return;
  }

  if (!fileName.trim()) {
    setScanStatus("❗ Please enter a valid file name.");
    return;
  }

  setLoading(true);
  setScanStatus(null);

  try {
    const response = await fetch(
      `${SCAN_API}/pdf?totalPages=${totalPages}&scanType=${scanType}&fileName=${fileName}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to scan document");
    }

    let downloadedFileName = "scanned_output.pdf";
    const disposition = response.headers.get("content-disposition");
    if (disposition) {
      const match = disposition.match(/filename="?([^"]+)"?/);
      if (match && match[1]) {
        downloadedFileName = match[1];
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = downloadedFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);

    setTotalPages("");
    setFileName("");
    setScanType("oneByOne");
    setScanStatus("✅ Document scanned successfully! Downloading...");
  } catch (error) {
    console.error("Error scanning PDF:", error);
    setScanStatus("❌ Failed to scan document.");
  } finally {
    setLoading(false);
  }
};



  return (
    <Layout>
      <div className="flex items-center justify-center h-[600px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md m-4">
          <h1 className="text-3xl font-bold text-center text-indigo-600 mb-6">
            Scan Your Documents
          </h1>

          <div className="mb-4">
            <label
              htmlFor="totalPages"
              className="block text-lg font-medium text-gray-700"
            >
              Enter Total Pages:
            </label>
            <input
              type="number"
              id="totalPages"
              value={totalPages}
              onChange={(e) => setTotalPages(e.target.value)}
              placeholder="Number of pages"
              className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="scanType"
              className="block text-lg font-medium text-gray-700"
            >
              Select Scan Type:
            </label>
            <select
              id="scanType"
              value={scanType}
              onChange={(e) => setScanType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            >
              <option value="oneByOne">One by One</option>
              <option value="multiple">Multiple</option>
            </select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="fileName"
              className="block text-lg font-medium text-gray-700"
            >
              Enter Name of Scanned Document:
            </label>
            <input
              type="text"
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="File name (e.g., scanned_report)"
              className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            />
          </div>


          <button
            onClick={handleScan}
            className={`w-full px-4 py-2 text-white font-semibold rounded-lg transition-all ${loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-indigo-500 hover:bg-indigo-600"
              }`}
            disabled={loading}
          >
            {loading ? "Scanning..." : "Start Scanning"}
          </button>

          {scanStatus && (
            <div
              className={`mt-4 p-4 rounded-lg ${scanStatus.startsWith("✅")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
                }`}
            >
              {scanStatus}
            </div>
          )}

          {loading && (
            <div className="mt-4 flex justify-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-dotted rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Scanner;