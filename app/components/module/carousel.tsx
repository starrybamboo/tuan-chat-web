const idPrefix = "_Slide";
interface CarouselItemProps {
  img: string;
  previous: number;
  index: number;
  after: number;
  alt?: string;
}

type CarouselProps = Pick<CarouselItemProps, "img" | "alt">;

function CarouselItem({ img, previous, index, after, alt }: CarouselItemProps) {
  return (
    <div className="carousel-item relative w-full" id={idPrefix + index}>
      <img src={img} alt={alt} className="w-full" />
      <div className="absolute left-5 right-5 top-1/2 flex -translate-y-1/2 transform justify-between">
        <a href={`#${idPrefix + previous}`} className="btn btn-circle">❮</a>
        <a href={`#${idPrefix + after}`} className="btn btn-circle">❯</a>
      </div>
    </div>
  );
}

// 修改 Carousel 组件的类型声明
function Carousel({ items, className }: { items: CarouselProps[]; className?: string }) {
  return (
    <div className={`carousel ${className}`}>
      {items.map((item, index) => {
        return (
          <CarouselItem
            img={item.img}
            previous={index - 1 < 0 ? items.length - 1 : index - 1}
            index={index}
            after={(index + 1) % items.length}
            alt={item.alt}
            key={item.img}
          />
        );
      })}
    </div>
  );
}

export default Carousel;
