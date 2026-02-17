const PdfViewer = ({ pdfUrl, onClose, name }) => {
  if (!pdfUrl) return null;


  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>{name}</h3>
          <div>
            
            <button style={styles.closeBtn} onClick={onClose}>X</button>
          </div>
        </div>

        <iframe
          id="pdfIframe"
          src={pdfUrl}
          style={styles.iframe}
          title="PDF Viewer"
        ></iframe>

      </div>
    </div>
  );
};

export default PdfViewer;

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
  },
  container: {
    width: "80%",
    height: "90%",
    background: "#fff",
    borderRadius: "8px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "10px",
    display: "flex",
    justifyContent: "space-between",
    borderBottom: "1px solid #ddd",
    background: "#f5f5f5",
  },
  btn: {
    marginRight: "10px",
    padding: "6px 12px",
    cursor: "pointer",
  },
  closeBtn: {
    padding: "6px 12px",
    cursor: "pointer",
    background: "red",
    color: "#fff",
  },
  iframe: {
    flex: 1,
    width: "100%",
    border: "none",
  },
};
