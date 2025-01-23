import React, { useState } from "react";
import Sidebar from "../Components/Sidebar";
import Header from "../Components/Header";
import axios from "axios";
import { API_HOST } from '../API/apiConfig';

const Scanner = () => {
  const [scanStatus, setScanStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState("");
  const [scanType, setScanType] = useState("oneByOne"); // Default scan type

  const token = localStorage.getItem("tokenKey");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleScan = async () => {
    if (!totalPages || totalPages <= 0) {
      setScanStatus("Please enter a number of total pages.");
      return;
    }
  
    setLoading(true);
    setScanStatus(null);
  
    try {
      const response = await axios.post(
        `${API_HOST}/api/scan/start?totalPages=${totalPages}&scanType=${scanType}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob", 
        }
      );
  
      if (response.status === 200) {
        setScanStatus("✅ Document scanned successfully! Downloading...");
  
        const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
        const link = document.createElement("a");
        link.href = url;
        const contentDisposition = response.headers["content-disposition"];
        const fileName = contentDisposition
          ? contentDisposition.split("filename=")[1].replace(/"/g, "")
          : "scanned_document.pdf";
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTotalPages("");
        setScanType("oneByOne");
      } else {
        setScanStatus("Unexpected response from the server.");
      }
    } catch (error) {
      setScanStatus(
        `❌ Error scanning document: ${
          error.response?.data?.message || error.message || "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex h-screen w-screen bg-neutral-100 overflow-hidden">
      {sidebarOpen && <Sidebar />}
      <div className="flex flex-col flex-1">
        <Header toggleSidebar={toggleSidebar} />
        <div className="p-4 bg-white">
          <div className="flex justify-center items-center h-screen rounded-lg p-5 mb-7 flex-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
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

              <button
                onClick={handleScan}
                className={`w-full px-4 py-2 text-white font-semibold rounded-lg transition-all ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-indigo-500 hover:bg-indigo-600"
                }`}
                disabled={loading}
              >
                {loading ? "Scanning..." : "Start Scanning"}
              </button>

              {scanStatus && (
                <div
                  className={`mt-4 p-4 rounded-lg ${
                    scanStatus.startsWith("✅")
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
        </div>
      </div>
    </div>
  );
};

export default Scanner;
