import React, { CSSProperties } from "react";

type DeviceCardProps = {
  status: "online" | "offline";
};

export default function DeviceCard({ status }: DeviceCardProps) {
  const getCardBackgroundColor = () => {
    return status === "online" ? "#70C1FF" : "#434343";
  };

  return (
    <div style={styles.wrapper}>
      {/* Card */}
      <svg
        style={styles.cardSvg}
        viewBox="0 0 339 216"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M199.289 0C217.631 0 232.5 14.8689 232.5 33.2107C232.5 51.5525 247.369 66.4215 265.711 66.4215H299C321.091 66.4215 339 84.3301 339 106.421V176C339 198.091 321.091 216 299 216H40C17.9086 216 1.54234e-06 198.091 3.44491e-06 176L1.51576e-05 40C1.70602e-05 17.9086 17.9086 0 40 0H199.289Z"
          fill={getCardBackgroundColor()}
        />
      </svg>
      <div style={styles.cardContent}>
        {/* Top right white pill */}
        <div style={styles.topPill} />

        {/* Icon placeholder */}
        <div style={styles.icon} />

        {/* Device name */}
        <div style={styles.deviceFrame}>
          <span style={styles.deviceText}>Laptop</span>
        </div>

        {/* Last active */}
        <div style={styles.infoBar1}>
          <span style={styles.infoText}>Last active time :</span>
        </div>

        {/* Today usage */}
        <div style={styles.infoBar2}>
          <span style={styles.infoText}>Today : 1.8 kW</span>
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: CSSProperties } = {
  wrapper: {
    position: "relative",
    width: 339,
    height: 216,
    filter: "drop-shadow(0px 4px 4px rgba(0,0,0,0.25))",
  } as CSSProperties,
  cardSvg: {
    position: "absolute",
    width: 339,
    height: 216,
  } as CSSProperties,
  cardContent: {
    position: "absolute",
    width: 339,
    height: 216,
  } as CSSProperties,
  topPill: {
    position: "absolute",
    width: 86,
    height: 55,
    left: 246,
    top: 0,
    background: "#FFFFFF",
    borderRadius: 30,
  } as CSSProperties,
  icon: {
    position: "absolute",
    left: "4.28%",
    top: "4.44%",
    width: 24,
    height: 24,
    background: "#FFFFFF",
    borderRadius: "50%",
  } as CSSProperties,
  deviceFrame: {
    position: "absolute",
    left: 21,
    top: 83,
    width: 108,
    height: 50,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  } as CSSProperties,
  deviceText: {
    fontFamily: "Montserrat, sans-serif",
    fontWeight: 300,
    fontSize: 25,
    color: "#FFFFFF",
  },
  infoBar1: {
    position: "absolute",
    left: 26,
    top: 146,
    width: 134,
    height: 21,
    background: "#000000",
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
  } as CSSProperties,
  infoBar2: {
    position: "absolute",
    left: 26,
    top: 173,
    width: 134,
    height: 21,
    background: "#000000",
    borderRadius: 20,
    display: "flex",
    alignItems: "center",
  } as CSSProperties,
  infoText: {
    marginLeft: 10,
    fontFamily: "Montserrat, sans-serif",
    fontWeight: 500,
    fontSize: 9,
    color: "#FFFFFF",
  },
};
