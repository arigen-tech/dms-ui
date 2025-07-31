import React, { useState, useEffect, useCallback } from "react"
import {
  BellIcon,
  XMarkIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  UserIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/solid"
import { BellAlertIcon } from "@heroicons/react/24/solid"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { API_HOST } from "../API/apiConfig"

const getNotificationIcon = (type) => {
  const commonClasses = "h-8 w-8 p-1.5 rounded-lg"
  switch (type) {
    case "DOCUMENT_APPROVAL":
    case "DOCUMENT_REJECTION":
    case "NEW_DOCUMENT":
      return (
        <div className={`${commonClasses} bg-blue-100`}>
          <DocumentTextIcon className="text-blue-600" />
        </div>
      )
    case "EMPLOYEE_UPDATE":
    case "EMPLOYEE_STATUS_CHANGE":
    case "NEW_EMPLOYEE_ADDED":
      return (
        <div className={`${commonClasses} bg-green-100`}>
          <UserIcon className="text-green-600" />
        </div>
      )
    case "ROLE_UPDATE":
      return (
        <div className={`${commonClasses} bg-purple-100`}>
          <UserGroupIcon className="text-purple-600" />
        </div>
      )
    default:
      return (
        <div className={`${commonClasses} bg-yellow-100`}>
          <ExclamationTriangleIcon className="text-yellow-600" />
        </div>
      )
  }
}

const getPriorityColor = (priority) => {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800 border border-red-200"
    case "medium":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200"
    default:
      return "bg-blue-100 text-blue-800 border border-blue-200"
  }
}

export const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0)
  const navigate = useNavigate()
  const tokenKey = localStorage.getItem("tokenKey")
  const userId = localStorage.getItem("userId")
  const role = localStorage.getItem("role")

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await axios.get(`${API_HOST}/notifications/unread-count`, {
        params: { employeeId: userId },
        headers: {
          Authorization: `Bearer ${tokenKey}`,
          Role: role,
        },
      })
      const { unreadCount } = response.data.response
      setUnreadCount(unreadCount)
    } catch (error) {
      console.error("Error fetching unread count:", error)
    }
  }, [userId, tokenKey, role])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 60000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  return (
    <div className="relative">
      <button
        onClick={() => navigate("/notifications")}
        className="relative p-3 text-gray-300 hover:text-white rounded-full "
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-7 w-7 text-white" />
        ) : (
          <BellIcon className="h-7 w-7 text-white" />
        )}

        {unreadCount > 0 && (
          <span className="absolute top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse shadow-lg">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}

export const Notification = () => {
  const [notifications, setNotifications] = useState([])
  const [filter, setFilter] = useState("all")
  const [selectedNotification, setSelectedNotification] = useState(null)
  const [isDetailView, setIsDetailView] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [clearingAll, setClearingAll] = useState(false);

  const navigate = useNavigate()

  const tokenKey = localStorage.getItem("tokenKey")
  const userId = localStorage.getItem("userId")
  const role = localStorage.getItem("role")

  const NOTIFICATION_TYPES = [
    "all",
    "DOCUMENT_APPROVAL",
    "DOCUMENT_REJECTION",
    "NEW_DOCUMENT",
    "EMPLOYEE_UPDATE",
    "EMPLOYEE_STATUS_CHANGE",
    "ROLE_UPDATE",
    "NEW_EMPLOYEE_ADDED",
  ]

  const formatFilterLabel = (filter) => {
    if (filter === "all") return "All"
    return filter
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ")
  }

  // Function to get count for each filter
  const getFilterCount = (filterType) => {
    if (filterType === "all") {
      return notifications.length
    }
    return notifications.filter((n) => n.type === filterType).length
  }

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_HOST}/notifications`, {
        params: { employeeId: userId },
        headers: { Authorization: `Bearer ${tokenKey}` },
      })
      const allNotifications = response.data.response

      // First filter by role
      const roleFilteredNotifications = allNotifications.filter((notification) => {
        if (role === "DEPARTMENT ADMIN") {
          return ["NEW_DOCUMENT", "NEW_EMPLOYEE_ADDED"].includes(notification.type)
        } else {
          return [
            "EMPLOYEE_UPDATE",
            "EMPLOYEE_STATUS_CHANGE",
            "ROLE_UPDATE",
            "DOCUMENT_APPROVAL",
            "DOCUMENT_REJECTION",
          ].includes(notification.type)
        }
      })

      // Then filter out read notifications
      const unreadNotifications = roleFilteredNotifications.filter(
        (notification) => !notification.read
      )

      setNotifications(unreadNotifications)
      setError(null)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setError("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }, [userId, tokenKey, role])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const getTimeAgo = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return "Just now"
  }

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_HOST}/notifications/${notificationId}/read`, null, {
        headers: { Authorization: `Bearer ${tokenKey}` },
      })

      // Immediately remove the notification from the list
      setNotifications(prevNotifications =>
        prevNotifications.filter(notification => notification.id !== notificationId)
      );

      if (isDetailView) {
        setIsDetailView(false)
        setSelectedNotification(null)
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleNotificationClick = async (notification) => {
    setSelectedNotification(notification)
    setIsDetailView(true)
    if (!notification.isRead) {
      setTimeout(() => {
        markAsRead(notification.id)
      }, 500)
    }
  }

  const handleBack = () => {
    if (isDetailView) {
      setIsDetailView(false)
      setSelectedNotification(null)
    } else {
      navigate(-1)
    }
  }

  const filteredNotifications = filter === "all" ? notifications : notifications.filter((n) => n.type === filter)

  const clearAllNotifications = async () => {
    if (notifications.length === 0) return;

    setClearingAll(true);
    try {
      // Mark all current notifications as read on the server
      const markAsReadPromises = notifications.map(notification =>
        axios.put(`${API_HOST}/notifications/${notification.id}/read`, null, {
          headers: { Authorization: `Bearer ${tokenKey}` },
        })
      );

      // Wait for all notifications to be marked as read
      await Promise.all(markAsReadPromises);

      // Clear the local state
      setNotifications([]);

      console.log("All notifications cleared successfully");
    } catch (error) {
      console.error("Error clearing notifications:", error);
      setError("Failed to clear all notifications");
    } finally {
      setClearingAll(false);
    }
  };



  const getNavigationButton = (notification) => {
    switch (notification.type) {
      case "DOCUMENT_APPROVAL":
        return {
          path: `/approvedDocs?docId=${notification.referenceId}`,
          label: "View Approved Document",
        }
      case "DOCUMENT_REJECTION":
        return {
          path: `/rejectedDocs?docId=${notification.referenceId}`,
          label: "View Rejected Document",
        }
      case "NEW_DOCUMENT":
        return {
          path: `/approve-documents?docId=${notification.referenceId}`,
          label: "View Document",
        }
      case "NEW_EMPLOYEE_ADDED":
        return {
          path: `/PendingRole?userId=${notification.referenceId}`,
          label: "View Employee Details",
        }
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          <p className="mt-6 text-lg text-gray-600 font-medium">Loading notifications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-xl shadow-lg animate-fade-in">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-6 w-6" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        ) : !isDetailView ? (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 max-h-[90vh] flex flex-col">
            <div className="flex-shrink-0">
              <div className="p-8 border-b border-gray-200 bg-gradient-to-r from-blue-800 to-blue-800">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleBack}
                      className="p-2.5 rounded-xl bg-blue-950 text-white hover:bg-blue-950 transition-all duration-200 transform hover:scale-105"
                    >
                      <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <h1 className="text-3xl font-bold text-white">Notifications</h1>
                  </div>
                </div>

                <div
                  className={`flex flex-nowrap gap-3 transition-all duration-300 overflow-x-auto pb-4 max-h-96 overflow-hidden`}
                >
                  {NOTIFICATION_TYPES.filter(
                    (type) =>
                      type === "all" ||
                      (role === "DEPARTMENT ADMIN"
                        ? ["NEW_DOCUMENT", "NEW_EMPLOYEE_ADDED"].includes(type)
                        : [
                          "EMPLOYEE_UPDATE",
                          "EMPLOYEE_STATUS_CHANGE",
                          "ROLE_UPDATE",
                          "DOCUMENT_APPROVAL",
                          "DOCUMENT_REJECTION",
                        ].includes(type)),
                  ).map((filterType) => {
                    const count = getFilterCount(filterType)
                    return (
                      <button
                        key={filterType}
                        onClick={() => setFilter(filterType)}
                        className={`px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 whitespace-nowrap flex-shrink-0 flex items-center space-x-2 ${filter === filterType
                            ? "bg-white text-blue-600 shadow-lg scale-105"
                            : "bg-blue-950 text-white hover:bg-blue-950"
                          }`}
                      >
                        <span>{formatFilterLabel(filterType)}</span>
                        {count > 0 && (
                          <span className={`px-2 py-1 text-xs mt-2 rounded-full font-bold ${
                            filter === filterType 
                              ? "bg-blue-600 text-white" 
                              : "bg-blue-800 text-white"
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-6 hover:bg-gray-50 transition-all duration-200 cursor-pointer ${!notification.isRead ? "bg-blue-50" : ""
                        }`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-base font-semibold text-gray-900">{notification.title}</p>
                            <span
                              className={`px-3 py-1.5 text-xs font-medium rounded-full ${getPriorityColor(notification.priority)}`}
                            >
                              {notification.priority}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-2 font-medium">{getTimeAgo(notification.createdOn)}</p>
                        </div>
                        <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <BellIcon className="h-16 w-16 mx-auto text-gray-400 mb-6" />
                    <p className="text-xl font-medium mb-2">No notifications to display</p>
                    <p className="text-sm text-gray-400">We'll notify you when something arrives</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 p-4 flex justify-center border-t border-gray-100">
              <button
                onClick={clearAllNotifications}
                className="flex items-center space-x-2 p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all duration-200"
              >
                <ExclamationTriangleIcon className="h-5 w-5" />
                <span className="text-sm">Clear All</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-[calc(100vh-4rem)] flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-800 p-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="p-2.5 rounded-xl bg-blue-950 text-white hover:bg-blue-900 transition-all duration-200"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <h2 className="text-2xl font-bold text-white truncate">
                {selectedNotification?.title}
              </h2>
            </div>
          </div>
      
          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              {/* Metadata */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  {selectedNotification && getNotificationIcon(selectedNotification.type)}
                  <span className="text-sm text-gray-500 font-medium">
                    {getTimeAgo(selectedNotification?.createdOn)}
                  </span>
                </div>
                <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${getPriorityColor(selectedNotification?.priority)}`}>
                  {selectedNotification?.priority}
                </span>
              </div>
      
              {/* Message */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                  {selectedNotification?.message}
                </p>
              </div>
      
              {/* Detailed Message */}
              {selectedNotification?.detailedMessage && (
                <div className="bg-gray-50 rounded-xl p-6 mt-4">
                  <h3 className="text-lg font-semibold mb-4">Additional Details</h3>
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: selectedNotification.detailedMessage,
                    }}
                  />
                </div>
              )}
      
              {/* Navigation Button */}
              {selectedNotification && getNavigationButton(selectedNotification) && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => navigate(getNavigationButton(selectedNotification).path)}
                    className="px-6 py-3 bg-blue-950 text-white rounded-xl hover:bg-blue-900 transition-all duration-200 flex items-center space-x-2"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                    <span>{getNavigationButton(selectedNotification).label}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}

export default Notification