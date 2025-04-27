function ModuleCard() {
  const image = [
    "https://imagebucket-1322308688.cos.ap-tokyo.myqcloud.com/picnia%2Fimage%2FIMG_4038.jpeg",
    "https://imagebucket-1322308688.cos.ap-tokyo.myqcloud.com/picnia%2Fimage%2FIMG_4031.jpeg",
    "https://imagebucket-1322308688.cos.ap-tokyo.myqcloud.com/picnia%2Fimage%2FIMG_3932.jpeg",
  ];
  return (
    <div className="w-full h-full rounded-md overflow-hidden flex flex-col">
      <div className="basis-70%">
        <img src={image[0]} />
      </div>
      <div className="basis-30%">

      </div>
    </div>
  );
}

export default ModuleCard;
