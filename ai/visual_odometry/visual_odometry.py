"""
visual_odometry.py — Lightweight monocular visual odometry.

Consumes consecutive webcam frames and estimates relative ego-motion.
Outputs a cumulative pose in a simple world frame suitable for frontend use:

{
    "x": float,   # lateral world displacement (meters-like units)
    "y": float,   # currently fixed 0.0
    "z": float,   # forward world displacement
    "yaw": float  # heading in degrees
}

Design goals:
- Robust enough for real-time demo usage.
- No strict camera calibration requirement.
- Graceful fallback when feature tracking quality is poor.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import atan2, cos, degrees, sin
from typing import Optional

import cv2
import numpy as np


@dataclass
class Pose:
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    yaw: float = 0.0  # radians internally


class VisualOdometry:
    """
    Monocular VO using feature tracking + essential matrix decomposition.

    Pipeline per frame:
      1) Convert frame to grayscale
      2) Detect ORB keypoints (initial frame)
      3) Track keypoints with LK optical flow
      4) Estimate relative pose (R, t) via Essential matrix
      5) Integrate heading + translation into cumulative pose

    Notes:
      - Translation scale from monocular VO is ambiguous; we apply a fixed scale.
      - This is intentionally lightweight and does not use bundle adjustment.
    """

    def __init__(
        self,
        max_features: int = 1200,
        lk_win_size: int = 21,
        min_tracked_points: int = 20,
        motion_scale: float = 0.08,
    ) -> None:
        self.orb = cv2.ORB_create(nfeatures=max_features)

        self.lk_params = dict(
            winSize=(lk_win_size, lk_win_size),
            maxLevel=3,
            criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 30, 0.01),
        )

        self.min_tracked_points = min_tracked_points
        self.motion_scale = motion_scale

        self.prev_gray: Optional[np.ndarray] = None
        self.prev_pts: Optional[np.ndarray] = None
        self.pose = Pose()

    def reset(self) -> None:
        self.prev_gray = None
        self.prev_pts = None
        self.pose = Pose()

    def get_pose(self) -> dict:
        return {
            "x": round(float(self.pose.x), 4),
            "y": round(float(self.pose.y), 4),
            "z": round(float(self.pose.z), 4),
            "yaw": round(float(degrees(self.pose.yaw)), 3),
        }

    def _detect_features(self, gray: np.ndarray) -> Optional[np.ndarray]:
        kps = self.orb.detect(gray, None)
        if not kps:
            return None
        pts = np.array([kp.pt for kp in kps], dtype=np.float32).reshape(-1, 1, 2)
        return pts if len(pts) > 0 else None

    def update(self, frame: np.ndarray) -> dict:
        if frame is None or frame.size == 0:
            return self.get_pose()

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Bootstrap first frame
        if self.prev_gray is None:
            self.prev_gray = gray
            self.prev_pts = self._detect_features(gray)
            return self.get_pose()

        # If no previous points, re-detect
        if self.prev_pts is None or len(self.prev_pts) < self.min_tracked_points:
            self.prev_pts = self._detect_features(self.prev_gray)
            if self.prev_pts is None:
                self.prev_gray = gray
                return self.get_pose()

        next_pts, status, _err = cv2.calcOpticalFlowPyrLK(
            self.prev_gray, gray, self.prev_pts, None, **self.lk_params
        )

        if next_pts is None or status is None:
            self.prev_gray = gray
            self.prev_pts = self._detect_features(gray)
            return self.get_pose()

        status = status.reshape(-1)
        good_prev = self.prev_pts[status == 1]
        good_next = next_pts[status == 1]

        if len(good_prev) < self.min_tracked_points:
            self.prev_gray = gray
            self.prev_pts = self._detect_features(gray)
            return self.get_pose()

        h, w = gray.shape[:2]
        focal = float(w)  # rough focal approximation
        pp = (w / 2.0, h / 2.0)

        E, mask = cv2.findEssentialMat(
            good_next,
            good_prev,
            focal=focal,
            pp=pp,
            method=cv2.RANSAC,
            prob=0.999,
            threshold=1.0,
        )

        if E is None:
            self.prev_gray = gray
            self.prev_pts = good_next.reshape(-1, 1, 2)
            return self.get_pose()

        _inliers, R, t, _mask_pose = cv2.recoverPose(E, good_next, good_prev, focal=focal, pp=pp)

        # Extract relative yaw from rotation matrix
        rel_yaw = atan2(R[0, 2], R[2, 2])
        self.pose.yaw += rel_yaw

        # Integrate translation (unit vector scaled by motion_scale)
        tx = float(t[0, 0]) * self.motion_scale
        tz = float(t[2, 0]) * self.motion_scale

        # Rotate local translation into world frame using current yaw
        cy = cos(self.pose.yaw)
        sy = sin(self.pose.yaw)
        world_dx = tx * cy - tz * sy
        world_dz = tx * sy + tz * cy

        self.pose.x += world_dx
        self.pose.z += world_dz
        self.pose.y = 0.0

        # Prepare next iteration
        self.prev_gray = gray
        self.prev_pts = good_next.reshape(-1, 1, 2)

        # Re-seed if tracking count dropped too low
        if len(self.prev_pts) < self.min_tracked_points * 2:
            redetected = self._detect_features(gray)
            if redetected is not None and len(redetected) > len(self.prev_pts):
                self.prev_pts = redetected

        return self.get_pose()
