"use client"

import { useRef, useState, useEffect, useCallback, useMemo } from "react"
import apiClient from "../API/apiClient"
import { useLocation } from "react-router-dom"
import Popup from "../Components/Popup"
import { useDropzone } from "react-dropzone"
import LoadingComponent from "../Components/LoadingComponent"
import { API_HOST, DOCUMENTHEADER_API, FILETYPE_API } from "../API/apiConfig"
import { MagnifyingGlassIcon, PencilIcon, EyeIcon, ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/solid"

const WaitingRoom = ({ fieldsDisabled }) => {
  const location = useLocation()
  const data = location.state
  const [formData, setFormData] = useState({
    mobile: "",
    title: "",
    employeeName: "",
    subject: "",
    category: null,
    year: null, // Changed to null for consistency with category
    email: "",
    uploadedFilePaths: [],
    uploadedFiles: [],
    version: "", // Added version to formData
    removedFilePaths: [], // Added for handling edits
  })
  const [uploadedFileNames, setUploadedFileNames] = useState([])
  const [uploadedFilePath, setUploadedFilePath] = useState([])
  // const [uploadedFileVersion, setUploadedFileVersion] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([])
  const [handleEditDocumentActive, setHandleEditDocumentActive] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState({ paths: [] })
  const [isUploadEnabled, setIsUploadEnabled] = useState(false)
  const [printTrue, setPrintTrue] = useState(false)
  const [categoryOptions, setCategoryOptions] = useState([])
  const [yearOptions, setYearOptions] = useState([])
  const [documents, setDocuments] = useState([])
  const [userBranch, setUserBranch] = useState([])
  const [userDep, setUserDep] = useState([])
  const fileInputRef = useRef(null)
  const [totalItems, setTotalItems] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isUploading, setIsUploading] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null) // To hold the document being edited
  const [popupMessage, setPopupMessage] = useState(null)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [searchTerm, setSearchTerm] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const token = localStorage.getItem("token") // Changed to 'token'
  const UserId = localStorage.getItem("userId")
  const [error, setError] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [filesType, setFilesType] = useState([])
  const [unsportFile, setUnsportFile] = useState(false)
  const [viewFileTypeModel, setViewFileTypeModel] = useState(false)
  const [folderUpload, setFolderUpload] = useState(false)
  const [uploadController, setUploadController] = useState(null)
  const [blobUrl, setBlobUrl] = useState("")
  const [contentType, setContentType] = useState("")
  const [selectedDocFile, setSelectedDocFiles] = useState(null)
  const [searchFileTerm, setSearchFileTerm] = useState("")
  const [openingFileIndex, setOpeningFileIndex] = useState(null)
  const [loading, setLoading] = useState(false)
  const [bProcess, setBProcess] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [openingFiles, setOpeningFiles] = useState(null)
  const [deletingFiles, setDeletingFiles] = useState(null)
  const formSectionRef = useRef(null)

  // Added filterCategory and filterYear states
  const [filterCategory, setFilterCategory] = useState("")
  const [filterYear, setFilterYear] = useState("")
  const [selectedDocument, setSelectedDocument] = useState(null) // For view modal

  console.log("formData", formData)
  useEffect(() => {
    if (data) {
      handleEditDocument(data)
    }
    fetchCategory()
    fetchYear()
    fetchDocuments()
    fetchPaths()
    fetchUser()
    fetchFilesType() // Added fetchFilesType call
  }, [])

  const showPopup = (message, type = "info") => {
    setPopupMessage({
      message,
      type,
      onClose: () => {
        setPopupMessage(null)
      },
    })
  }

  console.log("already uploaded", uploadedFilePath)

  const fetchFilesType = async () => {
    try {
      const response = await apiClient.get(`${FILETYPE_API}/getAllActive`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setFilesType(response?.data?.response ?? [])
    } catch (error) {
      console.error("Error fetching Files Types:", error)
      setFilesType([])
    }
  }

  const handleCategoryChange = (e) => {
    const selectedCategory = categoryOptions.find((category) => category.id === Number.parseInt(e.target.value))
    setFormData({ ...formData, category: selectedCategory })
  }

  const handleYearChange = (e) => {
    const selectedYear = yearOptions.find((year) => year.id === Number.parseInt(e.target.value))
    setFormData({ ...formData, year: selectedYear })
  }

  useEffect(() => {
    const { fileNo, title, subject, version, category, year, email, mobile, employeeName } = formData
    const isFormFilled =
      fileNo &&
      title &&
      subject &&
      version &&
      category &&
      year &&
      email &&
      mobile &&
      employeeName &&
      selectedFiles.length > 0
    setIsUploadEnabled(isFormFilled)
  }, [formData, selectedFiles])

  // Fetch categories
  const fetchCategory = async () => {
    try {
      const response = await apiClient.get(`${API_HOST}/CategoryMaster/findActiveCategory`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setCategoryOptions(response.data)
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const fetchYear = async () => {
    try {
      const response = await apiClient.get(`${API_HOST}/YearMaster/findActiveYear`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const currentYear = new Date().getFullYear()

      // ✅ Always normalize to array
      const yearsData = Array.isArray(response.data) ? response.data : response.data ? [response.data] : []

      const filteredYears = yearsData
        .filter((yearObj) => Number.parseInt(yearObj.name) <= currentYear)
        .sort((a, b) => Number.parseInt(b.name) - Number.parseInt(a.name))

      setYearOptions(filteredYears)
    } catch (error) {
      console.error("Error fetching Year:", error)
    }
  }

  const fetchUser = async () => {
    try {
      const userId = localStorage.getItem("userId")
      const response = await apiClient.get(`${API_HOST}/employee/findById/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUserBranch(response.data.branch.name)
      setUserDep(response.data.department.name)
    } catch (error) {
      console.error("Error fetching user branch:", error)
    }
  }

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(`${DOCUMENTHEADER_API}/pending/employee/${UserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDocuments(response.data)
      setTotalItems(response.data.length)
    } catch (error) {
      console.error("Error fetching documents:", error)
      // Optional: Add more detailed error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        console.error("Error response data:", error.response.data)
        console.error("Error response status:", error.response.status)
      } else if (error.request) {
        // The request was made but no response was received
        console.error("No response received:", error.request)
      } else {
        // Something happened in setting up the request
        console.error("Error setting up request:", error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  console.log("all doc by user", documents)

  // const extractFiles = async (items, fileList = []) => {
  //   for (const item of items) {
  //     if (item.kind === "file") {
  //       fileList.push(item.getAsFile());
  //     } else if (item.kind === "directory") {
  //       const directoryReader = item.createReader();
  //       const readEntries = async () => {
  //         const entries = await new Promise((resolve) =>
  //           directoryReader.readEntries(resolve)
  //         );
  //         if (entries.length > 0) {
  //           await extractFiles(entries, fileList);
  //         }
  //       };
  //       await readEntries();
  //     }
  //   }
  //   return fileList;
  // };

  const onDrop = useCallback(
    async (acceptedFiles, event) => {
      const files = acceptedFiles
      console.log("Dropped Files:", acceptedFiles)

      let isFolderDropped = false

      files.forEach((file) => {
        const path = file.path || file.webkitRelativePath || file.name
        const slashCount = (path.match(/[\\/]/g) || []).length

        if (slashCount > 1) {
          isFolderDropped = true
        }
      })

      if (isFolderDropped && !folderUpload) {
        showPopup("Please enable 'folderUpload' to upload folders.", "warning")
        return
      }

      if (!isFolderDropped && folderUpload) {
        showPopup("Please disable 'folderUpload' to upload files.", "warning")
        return
      }

      setSelectedFiles(files)

      const dataTransfer = new DataTransfer()
      files.forEach((file) => dataTransfer.items.add(file))
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files
      }
    },
    [folderUpload],
  )

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    directory: folderUpload,
    multiple: !folderUpload,
  })

  const openFile = async (file) => {
    try {
      setOpeningFiles(true)

      // Encode each segment separately to preserve folder structure
      const encodedPath = file.path.split("/").map(encodeURIComponent).join("/")
      const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}`

      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = URL.createObjectURL(blob)

      setBlobUrl(url)
      setContentType(response.headers["content-type"])
      setSearchFileTerm("")
      setIsModalOpen(true)
    } catch (error) {
      console.error("❌ Error fetching file:", error)
      alert("Failed to fetch or preview the file.")
    } finally {
      setOpeningFiles(false)
    }
  }

  const openFileBeforeSubmit = async (file, index) => {
    setOpeningFiles(index)
    try {
      const fileUrl = `${API_HOST}/api/documents/download/${file}`
      const response = await apiClient.get(fileUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      })

      const blob = new Blob([response.data], { type: response.headers["content-type"] })
      const url = URL.createObjectURL(blob)

      setBlobUrl(url)
      setContentType(response.headers["content-type"])
      setSearchFileTerm("")
      setIsModalOpen(true)
    } catch (error) {
      console.error("Error:", error)
      alert("Failed to fetch or preview the file.")
    } finally {
      setOpeningFiles(null)
    }
  }

  const handleDownload = async (file) => {
    const encodedPath = file.path.split("/").map(encodeURIComponent).join("/")
    const fileUrl = `${API_HOST}/api/documents/download/${encodedPath}`

    const response = await apiClient.get(fileUrl, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "blob",
    })

    const downloadBlob = new Blob([response.data], {
      type: response.headers["content-type"],
    })

    const link = document.createElement("a")
    link.href = window.URL.createObjectURL(downloadBlob)
    link.download = file.docName // download actual name with extension
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  const filteredDocFiles = useMemo(() => {
    if (!selectedDoc || !Array.isArray(selectedDoc.paths)) return []

    return selectedDoc.paths.filter((file) => {
      const name = file.docName.toLowerCase()
      const version = String(file.version).toLowerCase()
      const term = searchFileTerm.toLowerCase()
      return name.includes(term) || version.includes(term)
    })
  }, [selectedDoc, searchFileTerm])

  console.log("filteredDocFiles", filteredDocFiles)

  useEffect(() => {
    if (selectedDoc) {
      setLoadingFiles(true)
      setTimeout(() => {
        setLoadingFiles(false)
      }, 300)
    }
  }, [selectedDoc])

  const formatDate = (dateString) => {
    if (!dateString) return "--"
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return "--"
    const options = { day: "2-digit", month: "2-digit", year: "numeric" }
    return date.toLocaleString("en-GB", options).replace(",", "")
  }

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files)
    if (files.length > 0) {
      setSelectedFiles(files)
      setIsUploadEnabled(true)
    } else {
      setIsUploadEnabled(false)
    }
  }

  //   const handleFileChange = (event) => {
  //   const files = Array.from(event.target.files);

  //   if (files.length > 0) {
  //     const { category, year, version } = formData;

  //     // Map through files and rename
  //     const renamedFiles = files.map((file) => {
  //       const timestamp = Date.now();
  //       const baseName = file.name.split(".")[0].substring(0, 3); // first 3 chars
  //       const extension = file.name.split(".").pop(); // keep extension

  //       const newFileName = `${timestamp}_${baseName}_${category.name}_${year.name}_v${version || 1}.${extension}`;

  //       // Create a new File object with the new name
  //       return new File([file], newFileName, { type: file.type });
  //     });

  //     setSelectedFiles(renamedFiles);
  //     setIsUploadEnabled(true);
  //   } else {
  //     setIsUploadEnabled(false);
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateEmail(formData.email)) {
      alert("Please enter a valid email address")
      return
    }

    if (
      !formData.mobile ||
      !formData.title ||
      !formData.employeeName ||
      !formData.subject ||
      !formData.category ||
      !formData.year ||
      !formData.email
    ) {
      alert("Please fill in all required fields")
      return
    }

    if (formData.uploadedFilePaths.length === 0) {
      alert("Please upload at least one file")
      return
    }

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: formData.mobile,
          title: formData.title,
          employeeName: formData.employeeName,
          subject: formData.subject,
          category: formData.category,
          year: formData.year,
          email: formData.email,
          uploadedFilePaths: formData.uploadedFilePaths,
        }),
      })

      if (response.ok) {
        alert("Document submitted successfully!")
        handleDiscard()
        fetchDocuments()
      } else {
        alert("Failed to submit document")
      }
    } catch (error) {
      console.error("Error submitting document:", error)
      alert("Error submitting document")
    }
  }

  const validateRequiredFields = () => {
    const { mobile, title, employeeName, subject, category, year, email } = formData

    if (!mobile || !title || !employeeName || !subject || !category || !year || !email) {
      showPopup("Please fill in all the required fields and upload a file.", "error")
      return false
    }

    if (!validateEmail(email)) {
      showPopup("Please enter a valid email address", "error")
      return false
    }

    return true
  }

  const handleUploadDocument = async () => {
    if (!validateRequiredFields()) {
      return
    }

    if (selectedFiles.length === 0) {
      showPopup("Please select at least one file to upload.", "warning")
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    const uploadData = new FormData()
    const { category, year, version, fileNo, status } = formData

    uploadData.append("category", category?.name)
    uploadData.append("year", year?.name) // or year?.id if API expects id
    uploadData.append("version", version || 1)
    uploadData.append("branch", userBranch)
    uploadData.append("department", userDep)

    // ✅ Rename unique files name before uploading
    const renamedFiles = selectedFiles.map((file, index) => {
      const now = new Date()
      const formattedDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
        2,
        "0",
      )}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(
        2,
        "0",
      )}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(
        2,
        "0",
      )}${String(now.getMilliseconds()).padStart(3, "0")}`

      const baseName = fileNo.split(".")[0].substring(0, 3)
      const extension = file.name.split(".").pop()

      return {
        file,
        renamed: `${baseName}_${category?.name}_${year?.name}_${version}_${formattedDate}_${index + 1}.${extension}`,
      }
    })

    renamedFiles.forEach(({ file, renamed }) => {
      uploadData.append("files", file, renamed)
    })

    const controller = new AbortController()
    setUploadController(controller)

    try {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", `${API_HOST}/api/documents/upload`, true)
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      }

      xhr.onload = () => {
        setIsUploading(false)
        setUploadController(null)

        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText)

          if (result.uploadedFiles.length > 0) {
            // ✅ Store renamed file names for display
            setUploadedFileNames((prevNames) => [...prevNames, ...renamedFiles.map((f) => f.renamed)])

            // ✅ Map backend relative paths + keep renamed display name
            setUploadedFilePath((prevPath) => [
              ...prevPath,
              ...result.uploadedFiles.map((fileObj, index) => ({
                path: fileObj.relativePath, // actual backend path
                version: `${version}`,
                yearMaster: year,
                status: status,
                displayName: renamedFiles[index]?.renamed, // your renamed name
              })),
            ])

            // ✅ Also save in formData if needed
            setFormData((prevData) => ({
              ...prevData,
              uploadedFilePaths: [
                ...(prevData.uploadedFilePaths || []),
                ...result.uploadedFiles.map((fileObj, index) => ({
                  path: fileObj.relativePath,
                  version: `${version}`,
                  yearMaster: year,
                  status: status,
                  displayName: renamedFiles[index]?.renamed,
                })),
              ],
              version: "", // reset version
            }))

            if (fileInputRef.current) {
              fileInputRef.current.value = null
            }

            showPopup("Files uploaded successfully!", "success")
          }

          if (result.errors.length > 0) {
            showPopup(
              `Some files failed to upload:\n${result.errors.map((err) => `${err.file}: ${err.error}`).join("\n")}`,
              "error",
            )
            setUnsportFile(true)
          }
        } else {
          showPopup(`File upload failed: ${xhr.statusText}`, "error")
        }
      }

      xhr.onerror = () => {
        setIsUploading(false)
        showPopup("Upload failed due to a network error.", "error")
      }

      xhr.onabort = () => {
        setIsUploading(false)
        setUploadController(null)
        showPopup("Upload has been canceled.", "warning")
      }

      controller.signal.addEventListener("abort", () => {
        xhr.abort()
      })

      xhr.send(uploadData)
    } catch (error) {
      setIsUploading(false)
      showPopup(`File upload failed: ${error.message}`, "error")
    }
  }

  const handleCancelUpload = () => {
    if (uploadController) {
      uploadController.abort()
      setUploadController(null)
      setIsUploading(false)
      showPopup("Upload has been canceled.", "warning")
    }
  }

  const handleEditDocument = (doc) => {
    console.log("Editing document:", doc)
    setHandleEditDocumentActive(true)
    setEditingDoc(doc)

    const existingFiles = (doc.documentDetails || []).map((detail) => ({
      name: detail.path.split("/").pop(),
      version: detail.version,
      path: detail.path,
      status: detail.status,
      yearMaster: detail?.yearMaster || null,
      rejectionReason: detail?.rejectionReason || null,
      isExisting: true,
    }))

    setFormData({
      fileNo: doc.fileNo,
      title: doc.title,
      subject: doc.subject,
      version: doc.version,
      category: doc.categoryMaster || null,
      year: null, // ✅ pick year from first file (or handle UI differently if multiple years exist)
      mobile: doc.mobile, // Added mobile
      employeeName: doc.employeeName, // Added employeeName
      email: doc.email, // Added email
    })

    setUploadedFileNames(existingFiles.map((file) => file.name))

    setUploadedFilePath(
      existingFiles.map((file) => ({
        path: file.path,
        version: file.version,
        status: file.status,
        yearMaster: file.yearMaster || null, // ✅ correctly preserved
        rejectionReason: file.rejectionReason || null,
      })),
    )
    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }

  const handleSaveEdit = async () => {
    const userId = localStorage.getItem("userId")

    if (!userId || !token) {
      showPopup("User not logged in. Please log in again.", "error")
      return
    }

    const { fileNo, title, subject, category } = formData

    if (!fileNo || !title || !subject || !category || uploadedFilePath.length === 0) {
      showPopup("Please fill in all the required fields and upload files.", "error")
      return
    }

    const versionedFilePaths = uploadedFilePath.map((file) => ({
      path: file.path,
      version: file.version,
      yearId: file.yearMaster?.id,
    }))

    const payload = {
      documentHeader: {
        id: editingDoc.id,
        fileNo,
        title,
        subject,
        categoryMaster: { id: category.id },
        // yearMaster: { id: year.id },
        employee: { id: Number.parseInt(userId, 10) },
      },
      filePaths: versionedFilePaths,
    }

    try {
      setBProcess(true)

      const response = await fetch(`${API_HOST}/api/documents/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      console.log("API result:", result) // For debugging

      // ✅ Handle failure conditions
      if (!response.ok || result?.status === 409 || result?.message?.toLowerCase() !== "success") {
        const warningMessage = result?.response?.msg || result?.message || "Unknown error occurred"
        showPopup(`Document update failed: ${warningMessage}`, "warning")
        return
      }

      // ✅ Handle success case
      const successMessage = result?.response?.msg || result?.message || "Document updated successfully!"
      showPopup(successMessage, "success")

      resetEditForm()
      fetchDocuments()
    } catch (error) {
      console.error("Error updating document:", error)
      showPopup(`Document update failed: ${error.message}`, "warning")
    } finally {
      setBProcess(false)
    }
  }

  const resetEditForm = () => {
    setFormData({
      fileNo: "",
      title: "",
      subject: "",
      version: "",
      category: null,
      year: null, // Reset year
      mobile: "", // Reset mobile
      employeeName: "", // Reset employeeName
      email: "", // Reset email
      uploadedFilePaths: [],
      uploadedFiles: [],
      removedFilePaths: [], // Clear removed paths
    })
    setUploadedFilePath([])
    setSelectedFiles([])
    setUploadedFileNames([])
    // setUploadedFileVersion([]);
    setEditingDoc(null)
    setUnsportFile(false)
    setHandleEditDocumentActive(false) // Reset edit mode flag
  }

  const viewfiletype = () => {
    fetchFilesType()
    setViewFileTypeModel(true)
    setIsUploading(false)
  }

  const handlecloseFileType = () => {
    setViewFileTypeModel(false)
    setIsUploading(false)
  }

  console.log("uploadedFilePath before version change", formData)

  const handleVersionChange = (index, newVersion) => {
    setUploadedFilePath((prevPaths) =>
      prevPaths.map((file, i) =>
        i === index
          ? { ...file, version: newVersion } // Use the input as is, no prefix modification
          : file,
      ),
    )
  }

  console.log("uploadedFilePath", formData.uploadedFilePaths)

  // Handle adding the document
  const handleAddDocument = async () => {
    if (!validateRequiredFields()) {
      showPopup("Please fill in all the required fields.", "error");
      return;
    }

    if (formData.uploadedFiles.length === 0) {
      showPopup("Please upload at least one file.", "error");
      return;
    }

    try {
      setIsUploading(true);

      // Create the document object
      const newDocument = {
        mobile: formData.mobile,
        employeeName: formData.employeeName,
        subject: formData.subject,
        categoryMaster: formData.category,
        yearMaster: formData.year,
        email: formData.email,
        uploadedFiles: formData.uploadedFiles,
        createdOn: new Date().toISOString(),
      };

      // Add the new document to the documents list
      setDocuments((prevDocuments) => [newDocument, ...prevDocuments]);

      // Reset the form
      setFormData({
        mobile: "",
        title: "",
        employeeName: "",
        subject: "",
        category: null,
        year: null,
        email: "",
        uploadedFilePaths: [],
        uploadedFiles: [],
        version: "",
        removedFilePaths: [],
      });
      setSelectedFiles([]);
      setUploadedFileNames([]);

      showPopup("File(s) added successfully!", "success");
    } catch (error) {
      console.error("Error adding document:", error);
      showPopup("Failed to add file(s). Please try again.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const fetchPaths = async (doc) => {
    try {
      if (!token) {
        throw new Error("No authentication token found.")
      }

      if (!doc || !doc.id) {
        console.error("Invalid document or missing ID")
        return null
      }

      const documentId = doc.id.toString().trim()
      if (!documentId) {
        console.error("Document ID is empty or invalid", doc)
        return null
      }

      const response = await apiClient.get(`${DOCUMENTHEADER_API}/byDocumentHeader/${documentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      // Handle both response.data being an array or potentially being documentDetails
      const paths = Array.isArray(response.data) ? response.data : doc.documentDetails || []

      // Update the selected document state with full path information
      setSelectedDoc((prevDoc) => ({
        ...prevDoc,
        paths: paths,
      }))

      return paths
    } catch (error) {
      console.error("Error in fetchPaths:", error)
      showPopup(`Failed to fetch document paths: ${error.message || "Unknown error"}`, "error")
      return null
    }
  }

  const handleDiscardFile = (index) => {
    if (index < 0 || index >= uploadedFilePath.length) {
      console.error("Invalid index:", index)
      return
    }

    setDeletingFiles(index)

    try {
      const fileToDelete = uploadedFilePath[index]
      const isExistingFile =
        editingDoc &&
        editingDoc.documentDetails &&
        editingDoc.documentDetails.some((detail) => detail.path === fileToDelete.path)

      if (editingDoc && isExistingFile) {
        // If it's an existing file during edit, mark for removal
        setFormData((prev) => ({
          ...prev,
          removedFilePaths: [...(prev.removedFilePaths || []), fileToDelete],
        }))
      }

      // Remove from displayed lists
      setUploadedFileNames((prev) => prev.filter((_, i) => i !== index))
      setUploadedFilePath((prev) => prev.filter((_, i) => i !== index))

      console.log("File marked for deletion:", fileToDelete)
    } catch (err) {
      console.error("Error while discarding file:", err)
      alert("Failed to discard file. Please try again.")
    } finally {
      setDeletingFiles(null)
    }
  }

  const handleDiscardAll = () => {
    if (editingDoc) {
      // If editing, mark all current files for removal and clear displayed lists
      const allCurrentFiles = [...uploadedFilePath, ...(formData.removedFilePaths || [])]
      setFormData((prev) => ({
        ...prev,
        removedFilePaths: allCurrentFiles,
        uploadedFilePaths: [], // Clear from current form state
      }))
      setUploadedFileNames([])
      setUploadedFilePath([])
    } else {
      // For new document upload, simply clear everything
      setUploadedFileNames([])
      setUploadedFilePath([])
      setFormData((prev) => ({
        ...prev,
        uploadedFilePaths: [],
        uploadedFiles: [],
      }))
    }
    setSelectedFiles([]) // Clear selected files
    if (fileInputRef.current) {
      fileInputRef.current.value = null // Clear file input
    }
  }

  const openModal = (doc) => {
    setSelectedDoc(doc) // Set the selected document without paths first
    fetchPaths(doc) // Fetch paths and update the selected document with paths
    setIsOpen(true)
  }

  console.log("selectedDoccheack", selectedDoc)

  const closeModal = () => {
    setIsOpen(false)
    setSelectedDoc(null)
  }

  const printPage = () => {
    setPrintTrue(true)
    window.print()
    setTimeout(() => {
      setPrintTrue(false)
    }, 1000)
  }

  const handlePrintReport = async (id) => {
    if (!id) return

    try {
      const response = await fetch(`http://localhost:8443/api/reports/document/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/pdf",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error("Failed to download PDF")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }))

      // Create a temporary <a> element to download the PDF
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `document_${id}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading PDF:", error)
    }
  }

  const handleYearChangeForFile = (index, yearId) => {
    if (!Array.isArray(yearOptions)) return

    const selectedYear = yearOptions.find((y) => y.id === Number.parseInt(yearId))
    if (!selectedYear) return

    // ✅ update uploadedFilePath
    setUploadedFilePath((prev) => prev.map((file, i) => (i === index ? { ...file, yearMaster: selectedYear } : file)))

    // ✅ update formData, but preserve other fields
    setFormData((prev) => ({
      ...prev,
      uploadedFilePaths: Array.isArray(prev.uploadedFilePaths)
        ? prev.uploadedFilePaths.map((file, i) => (i === index ? { ...file, yearMaster: selectedYear } : file))
        : [],
    }))
  }

  useEffect(() => {
    if (selectedDoc && selectedDoc.id) {
      fetchQRCode(selectedDoc.id)
    }
  }, [selectedDoc])

  const fetchQRCode = async (documentId) => {
    try {
      if (!token) {
        throw new Error("Authentication token is missing")
      }

      // API URL to fetch the QR code
      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc.id}`

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`, // Add the token to the header
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch QR code")
      }

      const qrCodeBlob = await response.blob()

      console.log("Fetched QR code Blob:", qrCodeBlob)

      if (!qrCodeBlob.type.includes("image/png")) {
        throw new Error("Received data is not a valid image")
      }

      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob)

      setQrCodeUrl(qrCodeUrl)
    } catch (error) {
      setError("Error displaying QR Code: " + error.message)
    }
  }

  console.log(error)

  const downloadQRCode = async () => {
    if (!selectedDoc.id) {
      alert("Please enter a document ID")
      return
    }

    try {
      if (!token) {
        throw new Error("Authentication token is missing")
      }

      // API URL to download the QR code
      const apiUrl = `${DOCUMENTHEADER_API}/documents/download/qr/${selectedDoc.id}`

      // Fetch the QR code as a Blob (binary data) with the token in the Authorization header
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`, // Add the token to the header
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch QR code")
      }

      const qrCodeBlob = await response.blob()
      const qrCodeUrl = window.URL.createObjectURL(qrCodeBlob)

      // Create an anchor link to trigger the download
      const link = document.createElement("a")
      link.href = qrCodeUrl
      link.download = `QR_Code_${selectedDoc.id}.png` // Set a default name for the file
      link.click()

      // Clean up URL object
      window.URL.revokeObjectURL(qrCodeUrl)
    } catch (error) {
      setError("Error downloading QR Code: " + error.message)
    } finally {
      // setLoading(false);
    }
  }

  // const handleSearchResults = (results) => {
  //   setSearchResults(results);
  //   setCurrentPage(1); // Reset to first page when new search results come in
  // };

  const getPageNumbers = () => {
    const maxPageNumbers = 5
    const startPage = Math.floor((currentPage - 1) / maxPageNumbers) * maxPageNumbers + 1
    const endPage = Math.min(startPage + maxPageNumbers - 1, totalPages)
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
  }

  console.log("searchTerm", documents)

  const filteredDocuments = documents.filter((doc) => {
    const search = searchTerm.toLowerCase();
    const createdDate = doc.createdOn ? new Date(doc.createdOn).toLocaleDateString("en-GB") : ""; // Add null check for createdOn

    return (
      (doc.title && doc.title.toLowerCase().includes(search)) ||
      (doc.subject && doc.subject.toLowerCase().includes(search)) ||
      // doc.fileNo was replaced by mobile, so remove or update this line
      // (doc.fileNo && doc.fileNo.toLowerCase().includes(search)) ||
      (doc.mobile && doc.mobile.toLowerCase().includes(search)) || // Search by mobile
      (doc.employeeName && doc.employeeName.toLowerCase().includes(search)) || // Search by employee name
      (doc.email && doc.email.toLowerCase().includes(search)) || // Search by email
      (doc.categoryMaster && doc.categoryMaster.name && doc.categoryMaster.name.toLowerCase().includes(search)) ||
      (doc.yearMaster && doc.yearMaster.name && doc.yearMaster.name.toLowerCase().includes(search)) ||
      (doc.approvalStatus && doc.approvalStatus.toLowerCase().includes(search)) ||
      createdDate.includes(search)
    );
  });

  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage)
  const paginatedDocuments = filteredDocuments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const filteredFiles = (filesType ?? []).filter(
    (file) =>
      file.filetype?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.extension?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleFileUpload = (files) => {
    if (files.length === 0) {
      showPopup("Please select at least one file to upload.", "warning");
      return;
    }

    const validFiles = files.filter((file) => {
      // Add any file validation logic here if needed
      return true;
    });

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      setFormData((prev) => ({
        ...prev,
        uploadedFiles: validFiles.map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          path: URL.createObjectURL(file), // Create a temporary URL for preview
        })),
      }));
    } else {
      showPopup("No valid files selected.", "error");
    }
  };

  // Added handleDiscard function
  const handleDiscard = () => {
    setFormData({
      mobile: "",
      title: "",
      employeeName: "",
      subject: "",
      category: null,
      year: null, // Reset year
      email: "",
      uploadedFilePaths: [],
      uploadedFiles: [],
      version: "", // Reset version
      removedFilePaths: [], // Clear removed paths
    })
    // Reset other states if necessary
    setSelectedFiles([])
    setUploadedFileNames([])
    setUploadedFilePath([])
    setEditingDoc(null)
    setUnsportFile(false)
    setHandleEditDocumentActive(false) // Reset edit mode flag
    // Clear file input value if it's controlled
    if (fileInputRef.current) {
      fileInputRef.current.value = null
    }
  }

  // Added handleView function
  const handleView = (doc) => {
    setSelectedDocument(doc)
  }

  // Added handleDelete function
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      try {
        const response = await fetch(`${API_HOST}/api/documents/${id}`, {
          // Use API_HOST
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`, // Add token
          },
        })
        if (response.ok) {
          alert("Document deleted successfully!")
          fetchDocuments() // Refresh the list
        } else {
          const errorData = await response.json()
          alert(`Failed to delete document: ${errorData.message || response.statusText}`)
        }
      } catch (error) {
        console.error("Error deleting document:", error)
        alert("Error deleting document")
      }
    }
  }

  // Calculate pagination details
  const indexOfLastDocument = currentPage * itemsPerPage
  const indexOfFirstDocument = indexOfLastDocument - itemsPerPage
  const currentDocuments = filteredDocuments.slice(indexOfFirstDocument, indexOfLastDocument)

  if (loading) {
    return <LoadingComponent />
  }

  return (
    <div className="p-2">
      <div {...getRootProps()} className="p-0">
        <input {...getInputProps()} />
        <h1 className="text-xl mb-4 font-semibold">Upload to Waiting Room</h1>

        <div className="bg-white p-4 rounded-lg shadow-sm">
          {popupMessage && (
            <Popup message={popupMessage.message} type={popupMessage.type} onClose={() => setPopupMessage(null)} />
          )}

          {/* Single Form Section */}
          <div className="mb-4 bg-slate-100 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Mobile Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Mobile No</label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mobile No"
                  required
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Title"
                  required
                />
              </div>

              {/* Employee Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee Name</label>
                <input
                  type="text"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Employee Name"
                  required
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Subject"
                  required
                />
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={formData.category?.id || ""}
                  onChange={(e) => {
                    // Convert e.target.value to a number for comparison
                    const selectedCategoryId = Number(e.target.value);
                    const selectedCategory = categoryOptions.find((cat) => cat.id === selectedCategoryId);
                    setFormData((prev) => ({
                      ...prev,
                      category: selectedCategory || null,
                    }));
                  }}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Year</label>
                <select
                  value={formData.year?.id || ""}
                  onChange={(e) => {
                    // Convert e.target.value to a number for comparison
                    const selectedYearId = Number(e.target.value);
                    const selectedYear = yearOptions.find((year) => year.id === selectedYearId);
                    setFormData((prev) => ({
                      ...prev,
                      year: selectedYear || null,
                    }));
                  }}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Year</option>
                  {yearOptions.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Email with Validation */}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Email"
                  required
                />
                {formData.email && !validateEmail(formData.email) && (
                  <p className="text-red-500 text-sm mt-1">Please enter a valid email address</p>
                )}
              </div>
            </div>

            {/* File Upload Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload Files</label>
              <input
                type="file"
                multiple
                onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                className="hidden"
                id="file-upload"
                ref={fileInputRef}
                accept="*/*" // Allow all file types
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                Choose Files
              </label>
              <span className="ml-2 text-sm text-gray-500">
                {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : "No file chosen"}
              </span>
            </div>

            {/* Uploaded Files List */}
            {formData.uploadedFiles && formData.uploadedFiles.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files</h3>
                <div className="space-y-2">
                  {formData.uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <button
                        onClick={() => handleDiscardFile(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleDiscardAll}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Discard
              </button>
              <button
                onClick={handleAddDocument}
                disabled={!formData.uploadedFiles || formData.uploadedFiles.length === 0 || isUploading}
                className={`px-4 py-2 rounded-md text-sm text-white ${
                  !formData.uploadedFiles || formData.uploadedFiles.length === 0 || isUploading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {isUploading ? "Adding..." : "Add File"}
              </button>
            </div>
          </div>
        </div>

        {/* Table Section - keeping existing table, pagination, and search as requested */}
        <div className="mt-6">
          {/* Search and Show Controls */}
          <div className="mb-4 bg-slate-100 p-4 rounded-lg flex justify-between items-center">
            <div className="flex items-center bg-blue-500 rounded-lg">
              <label htmlFor="itemsPerPage" className="mr-2 ml-2 text-white text-sm">
                Show:
              </label>
              <select
                id="itemsPerPage"
                className="border rounded-r-lg p-1.5 outline-none"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
              >
                {[5, 10, 15, 20].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Search by mobile, employee name, subject..."
                className="border rounded-l-md p-1.5 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                maxLength={50}
              />
              <MagnifyingGlassIcon className="text-white bg-blue-500 rounded-r-lg h-8 w-8 border p-1.5" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border p-2 text-left">SR.</th>
                  <th className="border p-2 text-left">Mobile</th>
                  <th className="border p-2 text-left">Employee Name</th>
                  <th className="border p-2 text-left">Subject</th>
                  <th className="border p-2 text-left">Category</th>
                  <th className="border p-2 text-left">Year</th>
                  <th className="border p-2 text-left">Email</th>
                  <th className="border p-2 text-left">Created Date</th>
                  <th className="border p-2 text-left">Edit</th>
                  <th className="border p-2 text-left">View</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocuments.map((doc, index) => (
                  <tr key={index}>
                    <td className="border p-2">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td className="border p-2">{doc.mobile}</td>
                    <td className="border p-2">{doc.employeeName}</td>
                    <td className="border p-2">{doc.subject}</td>
                    <td className="border p-2">{doc.categoryMaster ? doc.categoryMaster.name : "No Category"}</td>
                    <td className="border p-2">{doc.yearMaster ? doc.yearMaster.name : "No Year"}</td>
                    <td className="border p-2">{doc.email}</td>
                    <td className="border p-2">{formatDate(doc.createdOn)}</td>
                    <td className="border p-2">
                      <button
                        onClick={() => handleEditDocument(doc)}
                        disabled={doc.isActive === 0}
                        className={`${doc.isActive === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <PencilIcon className="h-6 w-6 text-white bg-yellow-400 rounded-xl p-1" />
                      </button>
                    </td>
                    <td className="border p-2">
                      <button onClick={() => openModal(doc)}>
                        <EyeIcon className="h-6 w-6 bg-green-400 rounded-xl p-1 text-white" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="flex items-center mt-4">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || totalPages === 0}
                className={`px-3 py-1 rounded mr-3 ${
                  currentPage === 1 || totalPages === 0
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-slate-200 hover:bg-slate-300"
                }`}
              >
                <ArrowLeftIcon className="inline h-4 w-4 mr-2 mb-1" />
                Previous
              </button>

              {totalPages > 0 &&
                getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded mx-1 ${
                      currentPage === page ? "bg-blue-500 text-white" : "bg-slate-200 hover:bg-blue-100"
                    }`}
                  >
                    {page}
                  </button>
                ))}

              <span className="text-sm text-gray-700 mx-2">of {totalPages} pages</span>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`px-3 py-1 rounded ml-3 ${
                  currentPage === totalPages || totalPages === 0
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-slate-200 hover:bg-slate-300"
                }`}
              >
                Next
                <ArrowRightIcon className="inline h-4 w-4 ml-2 mb-1" />
              </button>

              <div className="ml-4">
                <span className="text-sm text-gray-700">
                  Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WaitingRoom
