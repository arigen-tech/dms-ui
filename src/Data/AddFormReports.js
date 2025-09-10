import { useState } from "react"
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/solid"

const AddFormReports = () => {
  const [loading, setLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isEditDataLoaded, setIsEditDataLoaded] = useState(false) // Declare the variable

  // Form data state
  const [formData, setFormData] = useState({
    menuId: "",
    menuName: "",
    parentId: "",
    parentName: "",
    url: "",
    status: "active",
  })

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    // Add your submit logic here
    console.log("Form submitted:", formData)
  }

  const resetForm = () => {
    setFormData({
      menuId: "",
      menuName: "",
      parentId: "",
      parentName: "",
      url: "",
      status: "active",
    })
    setIsEditDataLoaded(false)
  }

  return (
    <div className="px-2">
      <h1 className="text-2xl mb-1 font-semibold">Forms/Reports Management</h1>
      <div className="bg-white p-4 rounded-lg shadow-sm">
        {/* Form Section */}
        <div className="mb-4 bg-slate-100 p-4 rounded-lg">
          <h5 className="text-lg font-semibold mb-4">{isEditMode ? "Edit" : "Add"} Forms/Reports</h5>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isEditMode && (
              <div className="grid grid-cols-1 gap-4">
                <label className="block text-md font-medium text-gray-700">
                  APP Name <span className="text-red-500">*</span>
                  <div className="relative">
                    <input
                      type="text"
                      className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                      id="appName"
                      placeholder="Search Application Name"
                      autoComplete="off"
                      required
                    />
                    <MagnifyingGlassIcon className="absolute right-2 top-3 h-5 w-5 text-gray-400" />
                  </div>
                </label>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-md font-medium text-gray-700">
                Menu Name <span className="text-red-500">*</span>
                <div className="relative">
                  <input
                    type="text"
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                    id="menuName"
                    placeholder="Search Menu Name"
                    value={formData.menuName}
                    onChange={handleInputChange}
                    autoComplete="off"
                    required
                  />
                  <MagnifyingGlassIcon className="absolute right-2 top-3 h-5 w-5 text-gray-400" />
                </div>
              </label>

              <label className="block text-md font-medium text-gray-700">
                Menu ID <span className="text-red-500">*</span>
                <input
                  type="text"
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  id="menuId"
                  placeholder="Menu ID"
                  value={formData.menuId}
                  onChange={handleInputChange}
                  required
                  readOnly
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block text-md font-medium text-gray-700">
                Parent ID
                <div className="relative">
                  <input
                    type="text"
                    className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                    id="parentName"
                    placeholder="Search Parent ID"
                    value={formData.parentName}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                  <MagnifyingGlassIcon className="absolute right-2 top-3 h-5 w-5 text-gray-400" />
                </div>
              </label>

              <label className="block text-md font-medium text-gray-700">
                URL <span className="text-red-500">*</span>
                <input
                  type="text"
                  className="mt-1 block w-full p-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                  id="url"
                  placeholder="URL"
                  value={formData.url}
                  onChange={handleInputChange}
                  required
                />
              </label>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              {isEditMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditMode(false)
                      resetForm()
                    }}
                    className="bg-gray-300 text-gray-700 rounded-md px-4 py-2 hover:bg-gray-400"
                  >
                    <ArrowLeftIcon className="inline h-4 w-4 mr-1" /> Back
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-900 text-white rounded-md px-4 py-2 hover:bg-blue-800 flex items-center"
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-1" /> Update
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="submit"
                    className="bg-blue-900 text-white rounded-md px-4 py-2 hover:bg-blue-800 flex items-center"
                  >
                    <PlusCircleIcon className="h-5 w-5 mr-1" /> Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditMode(true)}
                    className="bg-gray-600 text-white rounded-md px-4 py-2 hover:bg-gray-700 flex items-center"
                  >
                    <PencilIcon className="h-5 w-5 mr-1" /> Edit
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddFormReports
