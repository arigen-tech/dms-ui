import { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { DOCUMENTHEADER_API } from "../API/apiConfig";

const SearchByScan = () => {
  const navigate = useNavigate();
  const [headerData, setHeaderData] = useState(null);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("tokenKey");
  const location = useLocation();

  useEffect(() => {
    const fetchDocument = async () => {
      const params = new URLSearchParams(location.search);
      const id = params.get("id");

      if (!id) {
        setError("No document ID found in the URL.");
        return;
      }

      if (!token) {
        debugger;
        navigate("/login");
        return;
      }

      try {
        const response = await axios.get(`${DOCUMENTHEADER_API}/findBy/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setHeaderData(response.data);
      } catch (err) {
        if (err.response) {
          console.error("Error response from server:", err.response.data);
          if (err.response.status === 404) {
            setError("Document not found. Please check the ID.");
          } else {
            setError(
              `Server error: ${err.response.statusText} (${err.response.status})`
            );
          }
        } else if (err.request) {
          console.error("No response received:", err.request);
          setError("No response from the server. Please try again later.");
        } else {
          console.error("Request error:", err.message);
          setError("Error occurred while setting up the request.");
        }
      }
    };

    fetchDocument();
  }, [location.search, token, navigate]);

  return (
    <div>
      {error && <p className="text-red-500">{error}</p>}
      {headerData ? (
        <div>
          <h1>Document Details</h1>
          <p>Department: {headerData.employee.department.name}</p>
          <p>Branch: {headerData.employee.branch.name}</p>
          <p>Title: {headerData.title}</p>
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default SearchByScan;
