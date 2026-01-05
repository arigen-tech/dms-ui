import { useState, useEffect } from "react";
import { SCAN_API } from '../API/apiConfig';
import Layout from "../Components/Layout";
// Import AutoTranslate components
import AutoTranslate from '../i18n/AutoTranslate';
import { useLanguage } from '../i18n/LanguageContext';
import { getFallbackTranslation } from '../i18n/autoTranslator';

const Scanner = () => {
  // Get language context
  const {
    currentLanguage,
    defaultLanguage,
    translationStatus,
    isTranslationNeeded,
    availableLanguages,
    changeLanguage,
    translate,
    preloadTranslationsForTerms
  } = useLanguage();

  const [scanStatus, setScanStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState("");
  const [scanType, setScanType] = useState("oneByOne");
  const [fileName, setFileName] = useState("");
  const token = localStorage.getItem("tokenKey");

  // Debug language status
  useEffect(() => {
    console.log('🔍 Scanner Component - Language Status:', {
      currentLanguage,
      defaultLanguage,
      isTranslationNeeded: isTranslationNeeded(),
      translationStatus,
      availableLanguagesCount: availableLanguages.length,
      pathname: window.location.pathname
    });
  }, [currentLanguage, defaultLanguage, translationStatus, isTranslationNeeded, availableLanguages]);

  const handleScan = async () => {
    if (!totalPages || totalPages <= 0) {
      setScanStatus(<AutoTranslate>❗ Please enter a valid number of total pages.</AutoTranslate>);
      return;
    }

    if (!fileName.trim()) {
      setScanStatus(<AutoTranslate>❗ Please enter a valid file name.</AutoTranslate>);
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
        throw new Error(<AutoTranslate>Failed to scan document</AutoTranslate>);
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
      setScanStatus(<AutoTranslate>✅ Document scanned successfully! Downloading...</AutoTranslate>);
    } catch (error) {
      console.error(<AutoTranslate>Error scanning PDF:</AutoTranslate>, error);
      setScanStatus(<AutoTranslate>❌ Failed to scan document.</AutoTranslate>);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center h-[600px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-lg">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md m-4">
          <h1 className="text-3xl font-bold text-center text-indigo-600 mb-6">
            <AutoTranslate>Scan Your Documents</AutoTranslate>
          </h1>

          <div className="mb-4">
            <label
              htmlFor="totalPages"
              className="block text-lg font-medium text-gray-700"
            >
              <AutoTranslate>Enter Total Pages:</AutoTranslate>
            </label>
            <input
              type="number"
              id="totalPages"
              value={totalPages}
              onChange={(e) => setTotalPages(e.target.value)}
              placeholder={getFallbackTranslation(
                'Number of pages',
                currentLanguage
              )}
              className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="scanType"
              className="block text-lg font-medium text-gray-700"
            >
              <AutoTranslate>Select Scan Type:</AutoTranslate>
            </label>
            <select
              id="scanType"
              value={scanType}
              onChange={(e) => setScanType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            >
              <option value="oneByOne"><AutoTranslate>One by One</AutoTranslate></option>
              <option value="multiple"><AutoTranslate>Multiple</AutoTranslate></option>
            </select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="fileName"
              className="block text-lg font-medium text-gray-700"
            >
              <AutoTranslate>Enter Name of Scanned Document:</AutoTranslate>
            </label>
            <input
              type="text"
              id="fileName"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder={getFallbackTranslation(
                'File name (e.g., scanned_report)',
                currentLanguage
              )}
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
            {loading ? <AutoTranslate>Scanning...</AutoTranslate> : <AutoTranslate>Start Scanning</AutoTranslate>}
          </button>

          {scanStatus && (
            <div
              className={`mt-4 p-4 rounded-lg ${typeof scanStatus === 'string' && scanStatus.startsWith("✅")
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