import { toast } from "react-toastify";

export const notifySuccess = (message) => {
    toast.success(message, {
        position: "bottom-right",
    });
};

export const notifyError = (message) => {
    toast.error(message, {
        position: "bottom-right",
    });
};

export const notifyInfo = (message) => {
    toast.info(message, {
        position: "bottom-right",
    });
};
