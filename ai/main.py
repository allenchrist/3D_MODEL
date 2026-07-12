from detector.video_detector import VideoDetector


def main():

    detector = VideoDetector()

    detector.detect(
        input_video="input/videos/road.mp4",
        output_video="output/videos/road_detected.mp4",
        output_json="output/json/video_detections.json"
    )


if __name__ == "__main__":
    main()