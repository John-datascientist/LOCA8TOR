// Image imports for quiz questions
import signStop from '@/assets/quiz/sign-stop.jpg';
import signYield from '@/assets/quiz/sign-yield.jpg';
import signSpeedLimit from '@/assets/quiz/sign-speed-limit.jpg';
import signPedestrian from '@/assets/quiz/sign-pedestrian.jpg';
import signNoEntry from '@/assets/quiz/sign-no-entry.jpg';
import signCurve from '@/assets/quiz/sign-curve.jpg';
import signParking from '@/assets/quiz/sign-parking.jpg';
import signNoOvertaking from '@/assets/quiz/sign-no-overtaking.jpg';
import signRailway from '@/assets/quiz/sign-railway.jpg';
import signOneWay from '@/assets/quiz/sign-one-way.jpg';
import signRoundabout from '@/assets/quiz/sign-roundabout.jpg';
import signNoUturn from '@/assets/quiz/sign-no-uturn.jpg';
import signSchoolZone from '@/assets/quiz/sign-school-zone.jpg';
import signNoParking from '@/assets/quiz/sign-no-parking.jpg';
import signSteepHill from '@/assets/quiz/sign-steep-hill.jpg';
import signConstruction from '@/assets/quiz/sign-construction.jpg';

import landmarkZuma from '@/assets/quiz/landmark-zuma-rock.jpg';
import landmarkThirdMainland from '@/assets/quiz/landmark-third-mainland.jpg';
import landmarkNationalTheatre from '@/assets/quiz/landmark-national-theatre.jpg';
import landmarkOlumo from '@/assets/quiz/landmark-olumo-rock.jpg';
import landmarkAso from '@/assets/quiz/landmark-aso-rock.jpg';
import landmarkLekkiIkoyi from '@/assets/quiz/landmark-lekki-ikoyi.jpg';
import landmarkTafawaBalewa from '@/assets/quiz/landmark-tafawa-balewa.jpg';
import landmarkObudu from '@/assets/quiz/landmark-obudu.jpg';
import landmarkYankari from '@/assets/quiz/landmark-yankari.jpg';
import landmarkKainjiDam from '@/assets/quiz/landmark-kainji-dam.jpg';
import landmarkOsunOsogbo from '@/assets/quiz/landmark-osun-osogbo.jpg';
import landmarkBeninWalls from '@/assets/quiz/landmark-benin-walls.jpg';
import landmarkLagosLagoon from '@/assets/quiz/landmark-lagos-lagoon.jpg';
import landmarkGuraraFalls from '@/assets/quiz/landmark-gurara-falls.jpg';

import type { QuizQuestion } from './quizData';

export interface ImageQuizQuestion extends QuizQuestion {
  imageOptions?: string[];
  questionImage?: string;
}

// Road sign image questions
export const imageRoadQuestions: ImageQuizQuestion[] = [
  {
    id: 'img-r1',
    question: 'Which of these is a STOP sign?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signYield, signSpeedLimit, signNoEntry, signStop], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img-r2',
    question: 'Which sign indicates No Entry?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signParking, signNoEntry, signCurve, signStop], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img-r3',
    question: 'Which sign means Parking Allowed?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signOneWay, signPedestrian, signParking, signNoOvertaking], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img-r4',
    question: 'Which sign warns of a sharp curve ahead?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signRailway, signStop, signCurve, signYield], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img-r5',
    question: 'Which sign indicates a pedestrian crossing zone?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signPedestrian, signSpeedLimit, signOneWay, signNoEntry], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img-r6',
    question: 'Which sign prohibits overtaking?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signStop, signNoOvertaking, signParking, signYield], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img-r7',
    question: 'Which sign warns of a railway crossing ahead?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signRailway, signNoEntry, signCurve, signSpeedLimit], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img-r8',
    question: 'Which sign indicates a one-way road?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signPedestrian, signOneWay, signStop, signParking], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img-r9',
    question: 'Which sign shows a speed limit?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signYield, signSpeedLimit, signRailway, signCurve], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img-r10',
    question: 'Which sign means Give Way?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signNoOvertaking, signOneWay, signNoEntry, signYield], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'easy',
  },
  // New road sign questions
  {
    id: 'img-r11',
    question: 'Which sign indicates a roundabout ahead?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signNoUturn, signRoundabout, signOneWay, signCurve], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img-r12',
    question: 'Which sign means No U-Turn?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signNoOvertaking, signRoundabout, signNoUturn, signStop], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img-r13',
    question: 'Which sign warns of a school zone?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signSchoolZone, signPedestrian, signConstruction, signSteepHill], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img-r14',
    question: 'Which sign means No Parking?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signNoParking, signParking, signNoEntry, signStop], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img-r15',
    question: 'Which sign warns of a steep hill ahead?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signSteepHill, signSchoolZone, signCurve, signConstruction], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img-r16',
    question: 'Which sign indicates a construction zone ahead?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signSteepHill, signRailway, signSchoolZone, signConstruction], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img-r17',
    question: 'Which of these is NOT a warning sign?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signRoundabout, signSchoolZone, signSteepHill, signConstruction], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'hard',
  },
  {
    id: 'img-r18',
    question: 'Which sign would you see near a railroad?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signConstruction, signSteepHill, signRailway, signRoundabout], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img-r19',
    question: 'Which sign prohibits parking but allows stopping?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signNoEntry, signNoParking, signNoOvertaking, signNoUturn], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'hard',
  },
  {
    id: 'img-r20',
    question: 'Which two signs are related to turning? Pick the No U-Turn sign.',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signCurve, signNoUturn, signRoundabout, signOneWay], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'hard',
  },
];

// Landmark image questions
export const imageLandmarkQuestions: ImageQuizQuestion[] = [
  {
    id: 'img-k1',
    question: 'Which of these is Zuma Rock?',
    options: ["Landmark B", "Landmark A", "Landmark C", "Landmark D"], imageOptions: [landmarkZuma, landmarkOlumo, landmarkAso, landmarkNationalTheatre], correctAnswer: 0,
    category: 'knowledge',
    difficulty: 'easy',
  },
  {
    id: 'img-k2',
    question: 'Which image shows the Third Mainland Bridge?',
    options: ["Landmark A", "Landmark B", "Landmark D", "Landmark C"], imageOptions: [landmarkLekkiIkoyi, landmarkNationalTheatre, landmarkZuma, landmarkThirdMainland], correctAnswer: 3,
    category: 'knowledge',
    difficulty: 'easy',
  },
  {
    id: 'img-k3',
    question: 'Which of these is Olumo Rock in Abeokuta?',
    options: ["Landmark B", "Landmark A", "Landmark C", "Landmark D"], imageOptions: [landmarkOlumo, landmarkAso, landmarkZuma, landmarkLekkiIkoyi], correctAnswer: 0,
    category: 'knowledge',
    difficulty: 'medium',
  },
  {
    id: 'img-k4',
    question: 'Which image shows the National Theatre Lagos?',
    options: ["Landmark A", "Landmark B", "Landmark C", "Landmark D"], imageOptions: [landmarkThirdMainland, landmarkZuma, landmarkNationalTheatre, landmarkOlumo], correctAnswer: 2,
    category: 'knowledge',
    difficulty: 'easy',
  },
  {
    id: 'img-k5',
    question: 'Which of these is Aso Rock in Abuja?',
    options: ["Landmark B", "Landmark A", "Landmark C", "Landmark D"], imageOptions: [landmarkAso, landmarkZuma, landmarkOlumo, landmarkThirdMainland], correctAnswer: 0,
    category: 'knowledge',
    difficulty: 'medium',
  },
  {
    id: 'img-k6',
    question: 'Which image shows the Lekki-Ikoyi Link Bridge?',
    options: ["Landmark B", "Landmark A", "Landmark C", "Landmark D"], imageOptions: [landmarkThirdMainland, landmarkLekkiIkoyi, landmarkNationalTheatre, landmarkAso], correctAnswer: 1,
    category: 'knowledge',
    difficulty: 'medium',
  },
  {
    id: 'img-k7',
    question: 'Can you tell the difference? Which is Zuma Rock (not Aso Rock)?',
    options: ["Landmark A", "Landmark B", "Landmark C", "Landmark D"], imageOptions: [landmarkAso, landmarkNationalTheatre, landmarkZuma, landmarkOlumo], correctAnswer: 2,
    category: 'knowledge',
    difficulty: 'hard',
  },
  {
    id: 'img-k8',
    question: 'Which landmark is located in Ogun State?',
    options: ["Landmark A", "Landmark B", "Landmark C", "Landmark D"], imageOptions: [landmarkLekkiIkoyi, landmarkOlumo, landmarkAso, landmarkZuma], correctAnswer: 1,
    category: 'knowledge',
    difficulty: 'hard',
  },
  {
    id: 'img-k9',
    question: 'Which of these landmarks is in Lagos?',
    options: ["Landmark A", "Landmark D", "Landmark C", "Landmark B"], imageOptions: [landmarkZuma, landmarkThirdMainland, landmarkOlumo, landmarkAso], correctAnswer: 1,
    category: 'knowledge',
    difficulty: 'medium',
  },
  {
    id: 'img-k10',
    question: 'Which image shows a bridge that connects Lekki to Ikoyi?',
    options: ["Landmark A", "Landmark B", "Landmark C", "Landmark D"], imageOptions: [landmarkThirdMainland, landmarkLekkiIkoyi, landmarkNationalTheatre, landmarkZuma], correctAnswer: 1,
    category: 'knowledge',
    difficulty: 'hard',
  },
  // New landmark questions
  {
    id: 'img-k11',
    question: 'Which image shows Tafawa Balewa Square?',
    options: ["Landmark A", "Landmark D", "Landmark C", "Landmark B"], imageOptions: [landmarkNationalTheatre, landmarkKainjiDam, landmarkObudu, landmarkTafawaBalewa], correctAnswer: 3,
    category: 'knowledge',
    difficulty: 'medium',
  },
  {
    id: 'img-k12',
    question: 'Which image shows the Obudu Mountain Resort?',
    options: ["Landmark A", "Landmark C", "Landmark B", "Landmark D"], imageOptions: [landmarkGuraraFalls, landmarkObudu, landmarkYankari, landmarkBeninWalls], correctAnswer: 1,
    category: 'knowledge',
    difficulty: 'medium',
  },
  {
    id: 'img-k13',
    question: 'Which image shows Yankari Game Reserve?',
    options: ["Landmark C", "Landmark B", "Landmark A", "Landmark D"], imageOptions: [landmarkLagosLagoon, landmarkObudu, landmarkYankari, landmarkOsunOsogbo], correctAnswer: 2,
    category: 'knowledge',
    difficulty: 'easy',
  },
  {
    id: 'img-k14',
    question: 'Which image shows the Kainji Dam?',
    options: ["Landmark A", "Landmark C", "Landmark B", "Landmark D"], imageOptions: [landmarkGuraraFalls, landmarkLagosLagoon, landmarkKainjiDam, landmarkTafawaBalewa], correctAnswer: 2,
    category: 'knowledge',
    difficulty: 'medium',
  },
  {
    id: 'img-k15',
    question: 'Which image shows the Osun-Osogbo Sacred Grove?',
    options: ["Landmark A", "Landmark B", "Landmark D", "Landmark C"], imageOptions: [landmarkBeninWalls, landmarkYankari, landmarkObudu, landmarkOsunOsogbo], correctAnswer: 3,
    category: 'knowledge',
    difficulty: 'hard',
  },
  {
    id: 'img-k16',
    question: 'Which image shows the ancient Benin City Walls?',
    options: ["Landmark A", "Landmark C", "Landmark B", "Landmark D"], imageOptions: [landmarkOsunOsogbo, landmarkGuraraFalls, landmarkBeninWalls, landmarkKainjiDam], correctAnswer: 2,
    category: 'knowledge',
    difficulty: 'hard',
  },
  {
    id: 'img-k17',
    question: 'Which image shows the Lagos Lagoon?',
    options: ["Landmark A", "Landmark B", "Landmark C", "Landmark D"], imageOptions: [landmarkKainjiDam, landmarkGuraraFalls, landmarkLagosLagoon, landmarkThirdMainland], correctAnswer: 2,
    category: 'knowledge',
    difficulty: 'easy',
  },
  {
    id: 'img-k18',
    question: 'Which image shows Gurara Waterfalls?',
    options: ["Landmark C", "Landmark B", "Landmark A", "Landmark D"], imageOptions: [landmarkOsunOsogbo, landmarkKainjiDam, landmarkGuraraFalls, landmarkYankari], correctAnswer: 2,
    category: 'knowledge',
    difficulty: 'medium',
  },
  {
    id: 'img-k19',
    question: 'Which of these is a UNESCO World Heritage Site in Osun State?',
    options: ["Landmark A", "Landmark B", "Landmark C", "Landmark D"], imageOptions: [landmarkBeninWalls, landmarkTafawaBalewa, landmarkOsunOsogbo, landmarkLekkiIkoyi], correctAnswer: 2,
    category: 'knowledge',
    difficulty: 'hard',
  },
  {
    id: 'img-k20',
    question: 'Which landmark is located in Cross River State?',
    options: ["Landmark A", "Landmark D", "Landmark C", "Landmark B"], imageOptions: [landmarkYankari, landmarkZuma, landmarkKainjiDam, landmarkObudu], correctAnswer: 3,
    category: 'knowledge',
    difficulty: 'hard',
  },
];
