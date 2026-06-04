import React from "react";
import iconUsers from "../Assets/icons/users.svg";

const CustomIcon = ({ src, className, alt = "icon", ...props }) => (
  <img 
    src={src} 
    className={className} 
    alt={alt} 
    {...props} 
  />
);
export const IconUsers = (props) => <CustomIcon src={iconUsers} {...props} />;



export default CustomIcon;