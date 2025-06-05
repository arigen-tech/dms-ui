import imageload from "../../src/Assets/9cc63f72ac8f5d18fa69b04dcc16eec2111.gif";

export default function LoadingComponent() {
  return (
    <div className="flex flex-col items-center justify-center h-[80vh] bg-gradient-to-br from-blue-300 via-blue-400 to-blue-700">
      <div className="relative flex items-center justify-center">
        {/* Animated border ring for extra effect */}
        <div className="absolute w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 rounded-full bg-gradient-to-tr from-blue-300 via-blue-500 to-blue-700 animate-pulse blur-lg opacity-60"></div>
        <img
          src={imageload}
          alt="Loading documents"
          className="relative z-10 w-32 h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 drop-shadow-xl"
        />
      </div>
      <p className="mt-3 text-white text-sm md:text-lg font-semibold tracking-wide animate-pulse drop-shadow">
        Loading documents...
      </p>
    </div>
  );
}