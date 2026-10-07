import sys
import json
import base64
import cv2
import numpy as np

# Load pre-trained OpenCV Haar cascades
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')

def analyze_image_bytes(image_bytes):
    # Decode image buffer to OpenCV BGR matrix
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {"error": "Failed to decode image buffer."}

    h, w, _ = img.shape
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # 1. Face Detection
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(40, 40)
    )

    face_count = len(faces)
    face_detected = face_count > 0
    head_direction = "CENTER"
    is_looking_away = False
    violations = []

    face_bboxes = []
    eye_count = 0

    if face_count == 0:
        violations.append("face_missing")
        head_direction = "UNKNOWN"
    elif face_count > 1:
        violations.append("multiple_people")
        head_direction = "MULTIPLE_FACES"
        for (fx, fy, fw, fh) in faces:
            face_bboxes.append({"x": int(fx), "y": int(fy), "w": int(fw), "h": int(fh)})
    else:
        # Exactly one face: analyze head pose and eyes
        (fx, fy, fw, fh) = faces[0]
        face_bboxes.append({"x": int(fx), "y": int(fy), "w": int(fw), "h": int(fh)})

        face_center_x = fx + fw / 2.0
        face_center_y = fy + fh / 2.0

        # Normalized horizontal offset from frame center [-0.5, 0.5]
        norm_x_offset = (face_center_x - (w / 2.0)) / w

        # Detect eyes within face region
        face_roi_gray = gray[fy:fy+fh, fx:fx+fw]
        eyes = eye_cascade.detectMultiScale(face_roi_gray, scaleFactor=1.1, minNeighbors=3, minSize=(15, 15))
        eye_count = len(eyes)

        # Head Yaw / Looking Away Heuristic
        if norm_x_offset < -0.15:
            head_direction = "LEFT"
            is_looking_away = True
            violations.append("looking_away")
        elif norm_x_offset > 0.15:
            head_direction = "RIGHT"
            is_looking_away = True
            violations.append("looking_away")
        elif (face_center_y / h) > 0.68:
            head_direction = "DOWN"
            is_looking_away = True
            violations.append("looking_away")
        else:
            head_direction = "CENTER"

    # 2. Mobile Phone / Screen Detection (Rectangular contour & brightness gradient)
    phone_detected = False
    phone_confidence = 0
    phone_bbox = None

    # Threshold for high brightness/screen glow
    _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        # Mobile phone screen occupies between 0.8% and 25% of total frame area
        if (h * w * 0.008) < area < (h * w * 0.35):
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)

            # Check if contour resembles a 4-corner polygon (rectangle)
            if len(approx) == 4:
                (rx, ry, rw, rh) = cv2.boundingRect(approx)
                aspect = float(rw) / float(rh) if rh > 0 else 0
                # Typical phone aspect ratio (vertical ~0.45-0.75, horizontal ~1.3-2.3)
                if (0.4 <= aspect <= 0.8) or (1.25 <= aspect <= 2.5):
                    phone_detected = True
                    phone_confidence = min(95, int(70 + (area / (h * w)) * 100))
                    phone_bbox = {"x": int(rx), "y": int(ry), "w": int(rw), "h": int(rh)}
                    if "phone_detected" not in violations:
                        violations.append("phone_detected")
                    break

    return {
        "success": True,
        "opencv_version": cv2.__version__,
        "frame_width": w,
        "frame_height": h,
        "face_detected": face_detected,
        "face_count": face_count,
        "eye_count": eye_count,
        "head_direction": head_direction,
        "is_looking_away": is_looking_away,
        "phone_detected": phone_detected,
        "phone_confidence": phone_confidence,
        "phone_bbox": phone_bbox,
        "face_bboxes": face_bboxes,
        "violations": violations
    }

if __name__ == "__main__":
    # Can accept base64 string or file path from argument or stdin
    if len(sys.argv) > 1:
        arg = sys.argv[1]
        if arg.startswith("data:image") or len(arg) > 256:
            # Base64 string
            if "base64," in arg:
                arg = arg.split("base64,")[1]
            raw_bytes = base64.b64decode(arg)
            print(json.dumps(analyze_image_bytes(raw_bytes)))
        else:
            # File path
            with open(arg, "rb") as f:
                print(json.dumps(analyze_image_bytes(f.read())))
    else:
        # Read from stdin
        raw_input = sys.stdin.read().strip()
        if "base64," in raw_input:
            raw_input = raw_input.split("base64,")[1]
        raw_bytes = base64.b64decode(raw_input)
        print(json.dumps(analyze_image_bytes(raw_bytes)))
