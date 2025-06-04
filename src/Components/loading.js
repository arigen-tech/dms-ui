import imageload from "../../src/Assets/9cc63f72ac8f5d18fa69b04dcc16eec2111.gif";

export default function LoadingComponent() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-300 via-blue-400 to-blue-700">
      <div className="relative flex items-center justify-center">
        {/* Animated border ring for extra effect */}
        <div className="absolute w-56 h-56 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-full bg-gradient-to-tr from-blue-300 via-blue-500 to-blue-700 animate-pulse blur-lg opacity-60"></div>
        <img
          src={imageload}
          alt="Loading documents"
          className="relative z-10 w-56 h-56 md:w-72 md:h-72 lg:w-96 lg:h-96 drop-shadow-xl"
        />
      </div>
      <p className="mt-8 text-white text-lg md:text-2xl font-semibold tracking-wide animate-pulse drop-shadow">
        Loading documents...
      </p>
    </div>
  );
}