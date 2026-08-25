import * as faceapi from '@vladmandic/face-api';

export type BiometricStatus =
  | 'INITIALIZING'
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'FACE_TOO_FAR'
  | 'FACE_NOT_CENTERED'
  | 'POOR_LIGHTING'
  | 'QUALITY_OK'
  | 'LIVENESS_CHALLENGE'
  | 'LIVENESS_PASSED'
  | 'EXTRACTING_EMBEDDING'
  | 'MATCHING'
  | 'APPROVED'
  | 'REJECTED'
  | 'ERROR';

export type LivenessChallengeType =
  | 'LOOK_STRAIGHT'
  | 'BLINK_EYES'
  | 'TURN_HEAD_LEFT'
  | 'TURN_HEAD_RIGHT'
  | 'SMILE';

export interface LivenessChallengeState {
  currentChallenge: LivenessChallengeType;
  instructions: string;
  isCompleted: boolean;
  stepNumber: number;
  totalSteps: number;
}

export interface FaceAnalysisResult {
  status: BiometricStatus;
  isFaceDetected: boolean;
  faceCount: number;
  confidence: number;
  quality: {
    brightness: number;
    boxArea: number;
    isCentered: boolean;
    isSharp: boolean;
  };
  landmarks?: faceapi.FaceLandmarks68;
  descriptor?: number[]; // Vetor 128D de Deep Learning ResNet-34
  photoPreview?: string;
  liveness: {
    ear: number; // Eye Aspect Ratio
    yawRatio: number; // Head Pose Yaw
    isBlinking: boolean;
    isSmiling: boolean;
    headDirection: 'CENTER' | 'LEFT' | 'RIGHT';
  };
  errorMessage?: string;
}

class FaceEngineService {
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * Inicializa as Redes Neurais Profundas (TinyFace, Landmarks68, FaceRecognition ResNet-34)
   */
  public async loadModels(): Promise<void> {
    if (this.isLoaded) return;
    if (this.isLoading && this.loadPromise) return this.loadPromise;

    this.isLoading = true;
    this.loadPromise = (async () => {
      try {
        const MODEL_URL = '/models';
        console.log('[FaceEngine] Carregando pesos neurais de /models...');

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);

        this.isLoaded = true;
        console.log('[FaceEngine] Redes Neurais carregadas com sucesso no WebGL!');
      } catch (err) {
        console.error('[FaceEngine] Falha ao carregar modelos biométricos:', err);
        throw new Error('Falha ao carregar modelos neurais de biometria facial.');
      } finally {
        this.isLoading = false;
      }
    })();

    return this.loadPromise;
  }

  public areModelsReady(): boolean {
    return this.isLoaded;
  }

  /**
   * Executa a inferência de visão computacional em tempo real sobre o elemento de vídeo.
   */
  public async analyzeLiveFrame(
    video: HTMLVideoElement,
    options?: { captureSnapshot?: boolean }
  ): Promise<FaceAnalysisResult> {
    if (!this.isLoaded || !video || video.videoWidth === 0 || video.videoHeight === 0 || video.readyState < 2) {
      return {
        status: 'INITIALIZING',
        isFaceDetected: false,
        faceCount: 0,
        confidence: 0,
        quality: { brightness: 0, boxArea: 0, isCentered: false, isSharp: false },
        liveness: { ear: 0, yawRatio: 1, isBlinking: false, isSmiling: false, headDirection: 'CENTER' },
        errorMessage: 'Aguardando inicialização das redes neurais...',
      };
    }

    try {
      // 1. Detecção Neural Real de Todos os Rostos no Frame (Rejeita mãos, paredes, objetos)
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.55,
      });

      const detections = await faceapi
        .detectAllFaces(video, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions();

      // Regra 1: Exatamente 1 rosto
      if (detections.length === 0) {
        return {
          status: 'NO_FACE',
          isFaceDetected: false,
          faceCount: 0,
          confidence: 0,
          quality: { brightness: 0, boxArea: 0, isCentered: false, isSharp: false },
          liveness: { ear: 0, yawRatio: 1, isBlinking: false, isSmiling: false, headDirection: 'CENTER' },
          errorMessage: 'Nenhum rosto humano detectado. Posicione-se de frente para a câmera.',
        };
      }

      if (detections.length > 1) {
        return {
          status: 'MULTIPLE_FACES',
          isFaceDetected: true,
          faceCount: detections.length,
          confidence: 0,
          quality: { brightness: 0, boxArea: 0, isCentered: false, isSharp: false },
          liveness: { ear: 0, yawRatio: 1, isBlinking: false, isSmiling: false, headDirection: 'CENTER' },
          errorMessage: 'Mais de 1 pessoa detectada! Apenas o colaborador deve estar no enquadramento.',
        };
      }

      const primaryDetection = detections[0];
      const box = primaryDetection.detection.box;
      const confidence = primaryDetection.detection.score;
      const landmarks = primaryDetection.landmarks;
      const descriptor = Array.from(primaryDetection.descriptor);

      // 2. Análise de Qualidade de Imagem e Enquadramento
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      const boxArea = box.width * box.height;
      const minDimension = Math.min(box.width, box.height);

      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const centerDistX = Math.abs(centerX - videoW / 2) / videoW;
      const centerDistY = Math.abs(centerY - videoH / 2) / videoH;
      const isCentered = centerDistX < 0.28 && centerDistY < 0.28;

      // Amostra de luminância
      const brightness = this.sampleLuminance(video, box);

      if (minDimension < 110) {
        return {
          status: 'FACE_TOO_FAR',
          isFaceDetected: true,
          faceCount: 1,
          confidence,
          quality: { brightness, boxArea, isCentered, isSharp: true },
          landmarks,
          liveness: { ear: 0, yawRatio: 1, isBlinking: false, isSmiling: false, headDirection: 'CENTER' },
          errorMessage: 'Aproxime-se mais da câmera.',
        };
      }

      if (!isCentered) {
        return {
          status: 'FACE_NOT_CENTERED',
          isFaceDetected: true,
          faceCount: 1,
          confidence,
          quality: { brightness, boxArea, isCentered, isSharp: true },
          landmarks,
          liveness: { ear: 0, yawRatio: 1, isBlinking: false, isSmiling: false, headDirection: 'CENTER' },
          errorMessage: 'Centralize seu rosto dentro da moldura circular.',
        };
      }

      if (brightness < 20) {
        return {
          status: 'POOR_LIGHTING',
          isFaceDetected: true,
          faceCount: 1,
          confidence,
          quality: { brightness, boxArea, isCentered, isSharp: true },
          landmarks,
          liveness: { ear: 0, yawRatio: 1, isBlinking: false, isSmiling: false, headDirection: 'CENTER' },
          errorMessage: 'Ambiente muito escuro. Aproxime-se de uma fonte de luz.',
        };
      }

      // 3. Extração dos Índices de Liveness (Eye Aspect Ratio & Head Pose Yaw)
      const ear = this.computeEyeAspectRatio(landmarks);
      const isBlinking = ear < 0.19;

      const yawRatio = this.computeYawRatio(landmarks);
      let headDirection: 'CENTER' | 'LEFT' | 'RIGHT' = 'CENTER';
      if (yawRatio > 1.65) headDirection = 'LEFT';
      else if (yawRatio < 0.6) headDirection = 'RIGHT';

      const isSmiling = (primaryDetection.expressions?.happy || 0) > 0.65;

      let photoPreview: string | undefined;
      if (options?.captureSnapshot) {
        photoPreview = this.captureCroppedFace(video, box);
      }

      return {
        status: 'QUALITY_OK',
        isFaceDetected: true,
        faceCount: 1,
        confidence,
        quality: { brightness, boxArea, isCentered, isSharp: true },
        landmarks,
        descriptor,
        photoPreview,
        liveness: {
          ear,
          yawRatio,
          isBlinking,
          isSmiling,
          headDirection,
        },
      };
    } catch (err) {
      console.error('[FaceEngine] Erro na inferência do frame:', err);
      return {
        status: 'ERROR',
        isFaceDetected: false,
        faceCount: 0,
        confidence: 0,
        quality: { brightness: 0, boxArea: 0, isCentered: false, isSharp: false },
        liveness: { ear: 0, yawRatio: 1, isBlinking: false, isSmiling: false, headDirection: 'CENTER' },
        errorMessage: 'Erro no processamento da imagem.',
      };
    }
  }

  /**
   * Cálculo de Eye Aspect Ratio (EAR) usando os 68 landmarks dos olhos.
   */
  public computeEyeAspectRatio(landmarks: faceapi.FaceLandmarks68): number {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    const getEar = (eye: faceapi.Point[]) => {
      const v1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
      const v2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
      const h = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
      return (v1 + v2) / (2.0 * (h || 1));
    };

    const leftEar = getEar(leftEye);
    const rightEar = getEar(rightEye);
    return Number(((leftEar + rightEar) / 2.0).toFixed(3));
  }

  /**
   * Estimação da rotação horizontal (Yaw) baseada na distância da ponta do nariz aos cantos dos olhos.
   */
  public computeYawRatio(landmarks: faceapi.FaceLandmarks68): number {
    const nose = landmarks.getNose();
    const noseTip = nose[3] || nose[0];
    const leftEye = landmarks.getLeftEye()[0];
    const rightEye = landmarks.getRightEye()[3];

    const distLeft = Math.hypot(noseTip.x - leftEye.x, noseTip.y - leftEye.y);
    const distRight = Math.hypot(noseTip.x - rightEye.x, noseTip.y - rightEye.y);

    return Number((distLeft / (distRight || 1)).toFixed(3));
  }

  /**
   * Amostra de luminância média dentro do bounding box facial.
   */
  private sampleLuminance(video: HTMLVideoElement, box: faceapi.Box): number {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');
      if (!ctx) return 100;

      ctx.drawImage(
        video,
        Math.max(0, box.x),
        Math.max(0, box.y),
        Math.min(video.videoWidth - box.x, box.width),
        Math.min(video.videoHeight - box.y, box.height),
        0,
        0,
        40,
        40
      );

      const imgData = ctx.getImageData(0, 0, 40, 40).data;
      let sum = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        sum += 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
      }
      return Math.round(sum / (40 * 40));
    } catch {
      return 100;
    }
  }

  /**
   * Captura snapshot recortado do rosto em alta definição.
   */
  public captureCroppedFace(video: HTMLVideoElement, box?: faceapi.Box): string {
    try {
      const canvas = document.createElement('canvas');
      const size = 360;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      if (box) {
        const padX = box.width * 0.2;
        const padY = box.height * 0.2;
        const srcX = Math.max(0, box.x - padX);
        const srcY = Math.max(0, box.y - padY);
        const srcW = Math.min(video.videoWidth - srcX, box.width + padX * 2);
        const srcH = Math.min(video.videoHeight - srcY, box.height + padY * 2);

        ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, size, size);
      } else {
        const minDim = Math.min(video.videoWidth, video.videoHeight);
        const srcX = (video.videoWidth - minDim) / 2;
        const srcY = (video.videoHeight - minDim) / 2;
        ctx.drawImage(video, srcX, srcY, minDim, minDim, 0, 0, size, size);
      }

      return canvas.toDataURL('image/jpeg', 0.9);
    } catch {
      return '';
    }
  }

  /**
   * Comparação Biométrica Real entre 2 Embeddings 128D (ResNet-34)
   * Baseado no padrão euclidiano do modelo FaceRecognitionNet:
   * - Distância <= 0.56: MESMA PESSOA (Match Aprovado)
   * - Distância > 0.56: PESSOAS DIFERENTES (Rejeitado)
   */
  public compareBiometricEmbeddings(
    capturedEmbedding: number[],
    templateEmbedding: number[] | null | undefined
  ): {
    matched: boolean;
    distance: number;
    similarityScore: number;
    reason: string;
  } {
    if (!templateEmbedding || templateEmbedding.length === 0) {
      return {
        matched: false,
        distance: 1.0,
        similarityScore: 0,
        reason: 'Colaborador sem perfil biométrico cadastrado no sistema.',
      };
    }

    if (!capturedEmbedding || capturedEmbedding.length !== 128 || templateEmbedding.length !== 128) {
      return {
        matched: false,
        distance: 1.0,
        similarityScore: 0,
        reason: 'Vetor de características biométricas inválido.',
      };
    }

    let sum = 0;
    for (let i = 0; i < 128; i++) {
      const diff = capturedEmbedding[i] - templateEmbedding[i];
      sum += diff * diff;
    }
    const euclideanDistance = Math.sqrt(sum);

    // Limiar padrão da arquitetura ResNet-34 para reconhecimento facial
    const THRESHOLD = 0.56;
    const isMatched = euclideanDistance <= THRESHOLD;
    const similarityScore = Math.max(0, Math.min(100, Math.round((1 - euclideanDistance / 1.0) * 100)));

    return {
      matched: isMatched,
      distance: Number(euclideanDistance.toFixed(4)),
      similarityScore,
      reason: isMatched
        ? 'Identidade Biométrica Confirmada com Sucesso.'
        : `Rosto não corresponde ao colaborador cadastrado (Distância: ${euclideanDistance.toFixed(2)}).`,
    };
  }
}

export const FaceEngine = new FaceEngineService();
