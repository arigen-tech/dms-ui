import React from "react";

import demoIcon from "../Assets/icons/demo-icon.svg";
import arrowRightIcon from "../Assets/icons/arrow-right.svg";



const CustomIcon = ({ src, className, alt = "icon", ...props }) => (
  <img 
    src={src} 
    className={className} 
    alt={alt} 
    {...props} 
  />
);

    export const DemoIcon = (props) => <CustomIcon src={demoIcon} {...props} />;
    export const ArrowRightIcon = (props) => <CustomIcon src={arrowRightIcon} {...props} />;



export default CustomIcon;