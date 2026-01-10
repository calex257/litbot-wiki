const LoadingDots = () => {
  const circleCommonClasses = "h-1.5 w-1.5 bg-violet-500 rounded-full";

  return (
    <div className="flex flex-col items-start gap-1">
      <p className="text-sm text-gray-500">Răspunsul vine imediat...</p>
      <div className="flex">
        <div className={`${circleCommonClasses} mr-1 animate-bounce`}></div>
        <div className={`${circleCommonClasses} mr-1 animate-bounce200`}></div>
        <div className={`${circleCommonClasses} animate-bounce400`}></div>
      </div>
    </div>
  );
};

export default LoadingDots;
