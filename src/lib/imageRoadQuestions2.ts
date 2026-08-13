// Additional image-based road marking questions (batch 2)
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
import signNoLeftTurn from '@/assets/quiz/sign-no-left-turn.jpg';
import signSlipperyRoad from '@/assets/quiz/sign-slippery-road.jpg';
import signTwoWay from '@/assets/quiz/sign-two-way.jpg';
import signHospital from '@/assets/quiz/sign-hospital.jpg';
import signMerging from '@/assets/quiz/sign-merging.jpg';
import signDeadEnd from '@/assets/quiz/sign-dead-end.jpg';
import signNarrowBridge from '@/assets/quiz/sign-narrow-bridge.jpg';
import signKeepLeft from '@/assets/quiz/sign-keep-left.jpg';

import type { ImageQuizQuestion } from './quizImages';

export const imageRoadQuestions2: ImageQuizQuestion[] = [
  // Using new signs
  {
    id: 'img2-r1',
    question: 'Which sign warns of a slippery road?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signSlipperyRoad, signCurve, signSteepHill, signConstruction], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r2',
    question: 'Which sign indicates a hospital nearby?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signSchoolZone, signParking, signHospital, signPedestrian], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r3',
    question: 'Which sign means No Left Turn?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signNoUturn, signNoLeftTurn, signKeepLeft, signOneWay], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r4',
    question: 'Which sign warns of merging traffic?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signTwoWay, signRoundabout, signMerging, signCurve], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r5',
    question: 'Which sign indicates a dead end?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signNoEntry, signNoLeftTurn, signStop, signDeadEnd], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r6',
    question: 'Which sign warns of a narrow bridge ahead?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signConstruction, signNarrowBridge, signSteepHill, signRailway], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r7',
    question: 'Which sign means Keep Left?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signKeepLeft, signNoLeftTurn, signOneWay, signRoundabout], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r8',
    question: 'Which sign warns of two-way traffic?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signMerging, signOneWay, signTwoWay, signNoOvertaking], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r9',
    question: 'Which of these is a mandatory sign (not a warning)?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signSlipperyRoad, signCurve, signKeepLeft, signSteepHill], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'hard',
  },
  {
    id: 'img2-r10',
    question: 'Which sign is an information/service sign?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signHospital, signStop, signNoEntry, signYield], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r11',
    question: 'Which of these prohibits a turning maneuver?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signNoLeftTurn, signStop, signDeadEnd, signSlipperyRoad], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r12',
    question: 'Which sign would you see before a dangerous curve AND slippery conditions?',
    options: ["Sign D", "Sign B", "Sign C", "Sign A"], imageOptions: [signNarrowBridge, signCurve, signSteepHill, signSlipperyRoad], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'hard',
  },
  {
    id: 'img2-r13',
    question: 'A blue circular sign is typically what type?',
    options: ["Sign A (Warning)", "Sign C (Prohibition)", "Sign B (Mandatory)", "Sign D (Information)"], imageOptions: [signSlipperyRoad, signNoEntry, signKeepLeft, signHospital], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'hard',
  },
  {
    id: 'img2-r14',
    question: 'Which sign should be obeyed at all times without exception?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signSlipperyRoad, signStop, signMerging, signNarrowBridge], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r15',
    question: 'Which sign indicates the road narrows ahead?',
    options: ["Sign A", "Sign B", "Sign D", "Sign C"], imageOptions: [signDeadEnd, signMerging, signTwoWay, signNarrowBridge], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r16',
    question: 'Which two signs are both prohibition signs? Pick the one with a red circle.',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signKeepLeft, signSlipperyRoad, signHospital, signNoOvertaking], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'hard',
  },
  {
    id: 'img2-r17',
    question: 'Which sign tells you there is no through road?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signDeadEnd, signStop, signNoEntry, signNoLeftTurn], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r18',
    question: 'If you see this sign, you must turn left. Which sign is it?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signNoLeftTurn, signRoundabout, signOneWay, signKeepLeft], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'hard',
  },
  {
    id: 'img2-r19',
    question: 'Which sign warns that another road joins yours?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signRoundabout, signMerging, signTwoWay, signDeadEnd], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r20',
    question: 'Which sign is NOT a warning sign?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signSlipperyRoad, signHospital, signNarrowBridge, signSteepHill], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'hard',
  },
  // More combinations using all 24 signs
  {
    id: 'img2-r21',
    question: 'Which sign indicates you cannot park here at any time?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signNoParking, signParking, signDeadEnd, signStop], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r22',
    question: 'Which sign warns of a railway level crossing?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signNarrowBridge, signRailway, signConstruction, signMerging], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r23',
    question: 'Which sign is used in school areas to protect children?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signPedestrian, signSpeedLimit, signHospital, signSchoolZone], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r24',
    question: 'Which sign restricts your maximum speed?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signKeepLeft, signNoOvertaking, signSpeedLimit, signYield], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r25',
    question: 'Which sign has a triangular shape indicating Give Way?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signStop, signNoEntry, signYield, signKeepLeft], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r26',
    question: 'Which sign warns of road works or construction?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signSlipperyRoad, signNarrowBridge, signDeadEnd, signConstruction], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r27',
    question: 'Which sign indicates a steep descent ahead?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signCurve, signSteepHill, signSlipperyRoad, signMerging], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r28',
    question: 'Which of these is a regulatory (prohibition) sign?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signSteepHill, signNoEntry, signMerging, signSlipperyRoad], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'hard',
  },
  {
    id: 'img2-r29',
    question: 'Which sign means traffic can only flow in one direction?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signTwoWay, signMerging, signOneWay, signRoundabout], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r30',
    question: 'Which sign is circular with a red border and means prohibition?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signYield, signNoOvertaking, signSchoolZone, signHospital], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r31',
    question: 'Which of these signs would you see at a hospital?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signHospital, signParking, signSchoolZone, signKeepLeft], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r32',
    question: 'Which sign warns that the road surface may be slippery when wet?',
    options: ["Sign A", "Sign B", "Sign D", "Sign C"], imageOptions: [signConstruction, signCurve, signSteepHill, signSlipperyRoad], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r33',
    question: 'Which of these signs relates to turning restrictions?',
    options: ["Sign D", "Sign B", "Sign C", "Sign A"], imageOptions: [signNoLeftTurn, signDeadEnd, signSlipperyRoad, signStop], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r34',
    question: 'Which sign would you find on a divided highway?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signTwoWay, signKeepLeft, signMerging, signDeadEnd], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'hard',
  },
  {
    id: 'img2-r35',
    question: 'Which sign warns you to slow down because the bridge is narrow?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signNarrowBridge, signRailway, signDeadEnd, signConstruction], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r36',
    question: 'Which sign indicates you can park your vehicle?',
    options: ["Sign A", "Sign B", "Sign D", "Sign C"], imageOptions: [signNoParking, signHospital, signKeepLeft, signParking], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r37',
    question: 'Which sign means you must not make a U-turn?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signNoLeftTurn, signNoUturn, signRoundabout, signNoOvertaking], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r38',
    question: 'Which of these is a warning sign about road geometry?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signHospital, signCurve, signStop, signParking], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r39',
    question: 'Which sign would you see when approaching a roundabout?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signMerging, signRoundabout, signTwoWay, signOneWay], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r40',
    question: 'Which sign is NOT related to road hazards?',
    options: ["Sign A", "Sign B", "Sign D", "Sign C"], imageOptions: [signSlipperyRoad, signSteepHill, signNarrowBridge, signParking], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r41',
    question: 'Which sign warns pedestrians are likely to cross?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signPedestrian, signSchoolZone, signHospital, signSpeedLimit], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r42',
    question: 'Which sign would you see at the end of a cul-de-sac?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signDeadEnd, signNoEntry, signStop, signNoLeftTurn], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r43',
    question: 'Which sign tells drivers they must not overtake?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signNoOvertaking, signNoUturn, signNoLeftTurn, signNoParking], correctAnswer: 0,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r44',
    question: 'Which sign is blue and square, indicating services?',
    options: ["Sign A", "Sign B", "Sign D", "Sign C"], imageOptions: [signKeepLeft, signNoEntry, signStop, signHospital], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r45',
    question: 'Which sign warns of traffic coming from the opposite direction?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signMerging, signRoundabout, signOneWay, signTwoWay], correctAnswer: 3,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r46',
    question: 'Which of these signs has an octagonal (8-sided) shape?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signYield, signNoEntry, signStop, signSpeedLimit], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'easy',
  },
  {
    id: 'img2-r47',
    question: 'Which sign means the road ahead has no exit?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signNoEntry, signDeadEnd, signNoUturn, signNoOvertaking], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'hard',
  },
  {
    id: 'img2-r48',
    question: 'Which sign would warn you before a sharp bend on a wet road?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signSteepHill, signSlipperyRoad, signNarrowBridge, signMerging], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'medium',
  },
  {
    id: 'img2-r49',
    question: 'Which of these signs is mandatory (you must obey)?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signSlipperyRoad, signStop, signNarrowBridge, signMerging], correctAnswer: 1,
    category: 'road-markings',
    difficulty: 'hard',
  },
  {
    id: 'img2-r50',
    question: 'Which sign would you NOT see on a motorway?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signSpeedLimit, signMerging, signSchoolZone, signOneWay], correctAnswer: 2,
    category: 'road-markings',
    difficulty: 'hard',
  },
];
