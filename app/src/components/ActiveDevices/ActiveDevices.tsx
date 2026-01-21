"use client";

import React, { useState, useEffect } from "react";
import styles from "./ActiveDevices.module.css";

interface ActiveDevicesProps {
  activeCount?: number;
  totalCount?: number;
}

export default function ActiveDevices({
  activeCount = 1,
  totalCount = 4,
}: ActiveDevicesProps) {
  return (
    <div className={styles.group9}>
      {/* Background Rectangle */}
      <div className={styles.rectangle3} />

      {/* Label */}
      <div className={styles.label}>Active devices</div>

      {/* Counter Frame */}
      <div className={styles.frame11}>
        <span className={styles.counter}>
          {activeCount} / {totalCount}
        </span>
      </div>
    </div>
  );
}
