import React from "react";
import { useLocation } from "react-router-dom";

const AdminOCRResponse = () => {
  const location = useLocation();
  const responseData = location.state?.responseData; 

  return (
    <div>
      <h1>OCR Response</h1>
      <pre>{JSON.stringify(responseData, null, 2)}</pre>
    </div>
  );
};

export default AdminOCRResponse;
