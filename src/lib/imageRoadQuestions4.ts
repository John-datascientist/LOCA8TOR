// Hard image-based road sign questions (batch 4) - 50 questions
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
import signNoHorn from '@/assets/quiz/sign-no-horn.jpg';
import signFallingRocks from '@/assets/quiz/sign-falling-rocks.jpg';
import signBicycle from '@/assets/quiz/sign-bicycle.jpg';
import signAnimalCrossing from '@/assets/quiz/sign-animal-crossing.jpg';
import signTJunction from '@/assets/quiz/sign-t-junction.jpg';
import signTrafficLight from '@/assets/quiz/sign-traffic-light.jpg';
import signRoadNarrows from '@/assets/quiz/sign-road-narrows.jpg';
import signNoRightTurn from '@/assets/quiz/sign-no-right-turn.jpg';
import type { ImageQuizQuestion } from './quizImages';

export const imageRoadQuestions4: ImageQuizQuestion[] = [
  { id: 'img4-001', question: 'Which sign forbids U-turns?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNoRightTurn, signNoLeftTurn, signRoundabout, signNoUturn], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-002', question: 'Identify the sign warning of a slippery road.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signFallingRocks, signCurve, signSlipperyRoad, signSteepHill], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-003', question: 'Which sign indicates a hospital ahead?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signSchoolZone, signTrafficLight, signParking, signHospital], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-004', question: 'Identify the merging traffic sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signTwoWay, signRoundabout, signMerging, signTJunction], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-005', question: 'Which sign indicates a dead end?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNoEntry, signOneWay, signRoadNarrows, signDeadEnd], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-006', question: 'Identify the narrow-bridge ahead sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signRoadNarrows, signTwoWay, signMerging, signNarrowBridge], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-007', question: 'Which sign instructs you to keep left?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signRoundabout, signOneWay, signKeepLeft, signMerging], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-008', question: 'Identify the \'no horn\' sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNoEntry, signNoOvertaking, signNoHorn, signNoParking], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-009', question: 'Which sign warns of falling rocks?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signFallingRocks, signConstruction, signSteepHill, signCurve], correctAnswer: 0, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-010', question: 'Identify the bicycle-crossing sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signAnimalCrossing, signSchoolZone, signBicycle, signPedestrian], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-011', question: 'Which sign warns of animals crossing?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signBicycle, signPedestrian, signSchoolZone, signAnimalCrossing], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-012', question: 'Identify the T-junction warning sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signTwoWay, signMerging, signRoundabout, signTJunction], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-013', question: 'Which sign warns of an upcoming traffic signal?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signSteepHill, signSchoolZone, signTrafficLight, signCurve], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-014', question: 'Identify the \'road narrows\' sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signMerging, signTwoWay, signNarrowBridge, signRoadNarrows], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-015', question: 'Which sign forbids a right turn?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNoRightTurn, signNoLeftTurn, signOneWay, signNoUturn], correctAnswer: 0, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-016', question: 'Identify the construction-zone sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signRoadNarrows, signConstruction, signSteepHill, signFallingRocks], correctAnswer: 1, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-017', question: 'Which sign forbids a left turn?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNoRightTurn, signKeepLeft, signNoUturn, signNoLeftTurn], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-018', question: 'Identify the steep hill warning.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signFallingRocks, signSlipperyRoad, signSteepHill, signCurve], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-019', question: 'Which sign indicates a school zone?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signTrafficLight, signHospital, signPedestrian, signSchoolZone], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-020', question: 'Identify the \'no parking\' sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNoParking, signParking, signNoEntry, signNoOvertaking], correctAnswer: 0, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-021', question: 'Which sign indicates parking is allowed?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signParking, signHospital, signSchoolZone, signNoParking], correctAnswer: 0, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-022', question: 'Identify the \'no overtaking\' sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNoOvertaking, signNoUturn, signNoParking, signNoEntry], correctAnswer: 0, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-023', question: 'Which sign warns of a railway crossing ahead?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signTrafficLight, signMerging, signTJunction, signRailway], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-024', question: 'Identify the \'one-way street\' sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signKeepLeft, signRoundabout, signOneWay, signTwoWay], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-025', question: 'Which sign indicates a roundabout ahead?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signMerging, signRoundabout, signTJunction, signTwoWay], correctAnswer: 1, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-026', question: 'Identify the pedestrian-crossing sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signSchoolZone, signAnimalCrossing, signPedestrian, signBicycle], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-027', question: 'Which sign means \'no entry\'?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNoUturn, signNoOvertaking, signNoParking, signNoEntry], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-028', question: 'Identify the dangerous-curve warning.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signSteepHill, signFallingRocks, signCurve, signSlipperyRoad], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-029', question: 'Which sign shows the speed limit?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signYield, signNoEntry, signSpeedLimit, signParking], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-030', question: 'Identify the \'yield\' sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signYield, signStop, signNoEntry, signSpeedLimit], correctAnswer: 0, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-031', question: 'Which sign means \'stop\'?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNoEntry, signStop, signSpeedLimit, signYield], correctAnswer: 1, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-032', question: 'Identify the two-way traffic sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signTwoWay, signMerging, signKeepLeft, signOneWay], correctAnswer: 0, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-033', question: 'Which sign warns of a slippery surface?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signSlipperyRoad, signCurve, signSteepHill, signFallingRocks], correctAnswer: 0, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-034', question: 'Identify the hospital information sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signSchoolZone, signPedestrian, signHospital, signParking], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-035', question: 'Which sign warns drivers that lanes merge ahead?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signRoundabout, signTJunction, signMerging, signTwoWay], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-036', question: 'Identify the dead-end sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNoEntry, signOneWay, signKeepLeft, signDeadEnd], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-037', question: 'Which sign indicates a narrow bridge ahead?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signRoadNarrows, signNarrowBridge, signMerging, signKeepLeft], correctAnswer: 1, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-038', question: 'Identify the keep-left mandatory sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signKeepLeft, signMerging, signOneWay, signRoundabout], correctAnswer: 0, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-039', question: 'Which sign forbids sounding the horn?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNoEntry, signNoHorn, signNoOvertaking, signNoParking], correctAnswer: 1, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-040', question: 'Identify the falling-rocks warning.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signCurve, signSteepHill, signSlipperyRoad, signFallingRocks], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-041', question: 'Which sign indicates a bicycle lane / crossing?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signSchoolZone, signPedestrian, signBicycle, signAnimalCrossing], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-042', question: 'Identify the wild-animal warning sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signBicycle, signPedestrian, signAnimalCrossing, signSchoolZone], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-043', question: 'Which sign warns of a T-junction ahead?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signTwoWay, signMerging, signRoundabout, signTJunction], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-044', question: 'Identify the upcoming traffic-light warning.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signRoundabout, signTrafficLight, signMerging, signTJunction], correctAnswer: 1, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-045', question: 'Which sign warns that the road narrows?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNarrowBridge, signRoadNarrows, signCurve, signMerging], correctAnswer: 1, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-046', question: 'Identify the no-right-turn sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNoUturn, signNoRightTurn, signOneWay, signNoLeftTurn], correctAnswer: 1, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-047', question: 'Which sign signals a construction zone?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signRoadNarrows, signFallingRocks, signSteepHill, signConstruction], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-048', question: 'Identify the no-left-turn sign.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signNoRightTurn, signNoUturn, signNoLeftTurn, signKeepLeft], correctAnswer: 2, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-049', question: 'Which sign warns of a steep descent?', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signCurve, signSteepHill, signFallingRocks, signSlipperyRoad], correctAnswer: 1, category: 'road-markings', difficulty: 'hard' },
  { id: 'img4-050', question: 'Identify the school-zone warning.', options: ['Sign A', 'Sign B', 'Sign C', 'Sign D'], imageOptions: [signPedestrian, signTrafficLight, signHospital, signSchoolZone], correctAnswer: 3, category: 'road-markings', difficulty: 'hard' },
];
