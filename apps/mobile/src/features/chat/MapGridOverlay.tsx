import { memo, useMemo } from "react";
import Svg, { Path } from "react-native-svg";

type MapGridOverlayProps = {
  width: number;
  height: number;
  gridRows: number;
  gridCols: number;
  gridColor: string;
};

export const MapGridOverlay = memo(({
  width,
  height,
  gridRows,
  gridCols,
  gridColor,
}: MapGridOverlayProps) => {
  const pathData = useMemo(() => {
    if (width <= 0 || height <= 0 || gridRows <= 0 || gridCols <= 0) {
      return "";
    }
    const cellWidth = width / gridCols;
    const cellHeight = height / gridRows;
    const parts: string[] = [];

    for (let col = 0; col <= gridCols; col++) {
      const x = col * cellWidth;
      parts.push(`M${x},0V${height}`);
    }
    for (let row = 0; row <= gridRows; row++) {
      const y = row * cellHeight;
      parts.push(`M0,${y}H${width}`);
    }
    return parts.join("");
  }, [width, height, gridRows, gridCols]);

  if (!pathData) {
    return null;
  }

  return (
    <Svg width={width} height={height} style={{ position: "absolute" }}>
      <Path d={pathData} stroke={`${gridColor}CC`} strokeWidth={1} fill="none" />
    </Svg>
  );
});
