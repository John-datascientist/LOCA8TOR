// Additional image-based road marking questions (batch 3) - 120 questions
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

export const imageRoadQuestions3: ImageQuizQuestion[] = [
  // --- EASY (40 questions) ---
  {
    id: "img3-001", question: 'Which sign prohibits honking?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signNoHorn, signNoEntry, signNoParking, signNoOvertaking], correctAnswer: 0, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-002", question: 'Which sign warns of falling rocks?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signSteepHill, signFallingRocks, signConstruction, signCurve], correctAnswer: 1, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-003", question: 'Which sign indicates a bicycle crossing?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signPedestrian, signBicycle, signAnimalCrossing, signSchoolZone], correctAnswer: 1, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-004", question: 'Which sign warns of animal crossing?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signPedestrian, signAnimalCrossing, signBicycle, signFallingRocks], correctAnswer: 1, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-005", question: 'Which sign warns of a T-junction ahead?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signCurve, signMerging, signTJunction, signDeadEnd], correctAnswer: 2, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-006", question: 'Which sign warns of traffic lights ahead?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signConstruction, signRailway, signTrafficLight, signSchoolZone], correctAnswer: 2, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-007", question: 'Which sign warns the road narrows?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signNarrowBridge, signMerging, signRoadNarrows, signTwoWay], correctAnswer: 2, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-008", question: 'Which sign prohibits right turns?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signNoLeftTurn, signNoRightTurn, signNoUturn, signNoEntry], correctAnswer: 1, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-009", question: 'Which sign indicates a stop?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signYield, signNoEntry, signStop, signSpeedLimit], correctAnswer: 2, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-010", question: 'Which sign indicates a roundabout?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signRoundabout, signOneWay, signTJunction, signMerging], correctAnswer: 0, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-011", question: 'Which sign means no U-turn?',
    options: ["Sign A", "Sign B", "Sign D", "Sign C"], imageOptions: [signNoRightTurn, signNoLeftTurn, signNoOvertaking, signNoUturn], correctAnswer: 3, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-012", question: 'Which sign warns of a steep hill?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signCurve, signFallingRocks, signSlipperyRoad, signSteepHill], correctAnswer: 3, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-013", question: 'Which sign warns of a railway crossing?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signRailway, signTrafficLight, signTJunction, signConstruction], correctAnswer: 0, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-014", question: 'Which sign means no entry?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signNoEntry, signNoParking, signStop, signNoHorn], correctAnswer: 0, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-015", question: 'Which sign indicates a dead end?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signTJunction, signNoEntry, signOneWay, signDeadEnd], correctAnswer: 3, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-016", question: 'Which sign indicates parking is allowed?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signNoParking, signHospital, signParking, signKeepLeft], correctAnswer: 2, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-017", question: 'Which sign means keep left?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signOneWay, signNoLeftTurn, signKeepLeft, signRoundabout], correctAnswer: 2, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-018", question: 'Which sign indicates a school zone?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signSchoolZone, signPedestrian, signHospital, signBicycle], correctAnswer: 0, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-019", question: 'Which sign indicates a narrow bridge?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signRoadNarrows, signMerging, signTwoWay, signNarrowBridge], correctAnswer: 3, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-020", question: 'Which sign shows a speed limit?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signStop, signNoHorn, signNoEntry, signSpeedLimit], correctAnswer: 3, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-021", question: 'Which sign prohibits left turns?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signNoRightTurn, signNoUturn, signNoLeftTurn, signKeepLeft], correctAnswer: 2, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-022", question: 'Which sign warns of a curve ahead?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signSlipperyRoad, signCurve, signSteepHill, signRoadNarrows], correctAnswer: 1, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-023", question: 'Which sign warns of construction ahead?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signFallingRocks, signSteepHill, signConstruction, signSlipperyRoad], correctAnswer: 2, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-024", question: 'Which sign indicates a one-way road?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signKeepLeft, signOneWay, signTwoWay, signNoEntry], correctAnswer: 1, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-025", question: 'Which sign indicates pedestrian crossing?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signPedestrian, signBicycle, signSchoolZone, signAnimalCrossing], correctAnswer: 0, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-026", question: 'Which sign prohibits overtaking?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signNoOvertaking, signNoHorn, signNoEntry, signNoParking], correctAnswer: 0, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-027", question: 'Which sign warns of merging traffic?',
    options: ["Sign A", "Sign B", "Sign D", "Sign C"], imageOptions: [signTJunction, signRoadNarrows, signTwoWay, signMerging], correctAnswer: 3, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-028", question: 'Which sign indicates two-way traffic?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signOneWay, signTwoWay, signMerging, signKeepLeft], correctAnswer: 1, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-029", question: 'Which sign means yield / give way?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signStop, signYield, signNoEntry, signSpeedLimit], correctAnswer: 1, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-030", question: 'Which sign prohibits parking?',
    options: ["Sign A", "Sign B", "Sign D", "Sign C"], imageOptions: [signParking, signNoHorn, signNoEntry, signNoParking], correctAnswer: 3, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-031", question: 'Which sign warns of a slippery road?',
    options: ["Sign B", "Sign A", "Sign C", "Sign D"], imageOptions: [signSlipperyRoad, signFallingRocks, signRoadNarrows, signCurve], correctAnswer: 0, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-032", question: 'Which sign indicates a hospital nearby?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signParking, signSchoolZone, signHospital, signTrafficLight], correctAnswer: 2, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-033", question: 'Which of these signs is circular in shape?',
    options: ["Sign A", "Sign B", "Sign D", "Sign C"], imageOptions: [signTJunction, signFallingRocks, signAnimalCrossing, signNoEntry], correctAnswer: 3, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-034", question: 'Which of these is a warning sign?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signFallingRocks, signStop, signNoEntry, signParking], correctAnswer: 0, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-035", question: 'Which sign is a regulatory (prohibition) sign?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signNoHorn, signAnimalCrossing, signCurve, signSteepHill], correctAnswer: 0, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-036", question: 'Which sign tells you to prepare to stop at traffic lights?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signTrafficLight, signStop, signYield, signRailway], correctAnswer: 0, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-037", question: 'Which sign warns about wildlife on the road?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signBicycle, signPedestrian, signAnimalCrossing, signSchoolZone], correctAnswer: 2, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-038", question: 'Which sign indicates road works or construction?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signSteepHill, signFallingRocks, signConstruction, signSlipperyRoad], correctAnswer: 2, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-039", question: 'Which sign is associated with a silent zone?',
    options: ["Sign A", "Sign B", "Sign C", "Sign D"], imageOptions: [signNoParking, signNoOvertaking, signNoHorn, signNoEntry], correctAnswer: 2, category: 'road-markings', difficulty: 'easy',
  },
  {
    id: "img3-040", question: 'Which sign shows a bicycle?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signAnimalCrossing, signPedestrian, signBicycle, signSchoolZone], correctAnswer: 2, category: 'road-markings', difficulty: 'easy',
  },

  // --- MEDIUM (40 questions) ---
  {
    id: "img3-041", question: 'If you see this sign, what should you do?',
    options: ["Speed up", "Honk to warn others", "Slow down and watch for rocks", "Park here"],
    questionImage: signFallingRocks,
    correctAnswer: 2, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-042", question: 'What action does this sign require?',
    options: ["Sound your horn", "Keep quiet - no horns allowed", "Speed up", "Turn right"],
    questionImage: signNoHorn,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-043", question: 'What should you do when you see this sign?',
    options: ["Accelerate", "Watch for cyclists", "Park your bicycle", "No bicycles allowed"],
    questionImage: signBicycle,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-044", question: 'This sign warns you to:',
    options: ["Watch for pets", "Slow down - animals may cross", "Speed up past animal zone", "Honk to scare animals"],
    questionImage: signAnimalCrossing,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-045", question: 'What does this sign indicate about the road ahead?',
    options: ["Road ends", "T-intersection ahead", "U-turn allowed", "Road merges"],
    questionImage: signTJunction,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-046", question: 'What should you prepare for when you see this sign?',
    options: ["A speed bump", "Traffic signals ahead", "A roundabout", "A toll gate"],
    questionImage: signTrafficLight,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-047", question: 'This sign means the road ahead:',
    options: ["Gets wider", "Narrows on both sides", "Has a bridge", "Is one-way"],
    questionImage: signRoadNarrows,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-048", question: 'This sign prohibits which manoeuvre?',
    options: ["Left turn", "U-turn", "Right turn", "Overtaking"],
    questionImage: signNoRightTurn,
    correctAnswer: 2, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-049", question: 'Where would you typically find this sign?',
    options: ["Highway entrance", "Near hospitals and schools", "Parking lots", "At toll booths"],
    questionImage: signNoHorn,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-050", question: 'This sign is most commonly found in:',
    options: ["Urban areas", "Mountainous/hilly terrain", "Parking lots", "Airports"],
    questionImage: signFallingRocks,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-051", question: 'What type of sign is this?',
    options: ["Informational", "Warning", "Regulatory", "Guide"],
    questionImage: signAnimalCrossing,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-052", question: 'What type of sign is this?',
    options: ["Warning", "Regulatory (prohibition)", "Informational", "Guide"],
    questionImage: signNoRightTurn,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-053", question: 'You see this sign on a rainy day. What should you do?',
    options: ["Speed up to get through quickly", "Reduce speed significantly", "Turn on high beams", "Honk repeatedly"],
    questionImage: signSlipperyRoad,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-054", question: 'What does this sign mean for heavy vehicles?',
    options: ["Use lower gear", "Speed up on the hill", "No heavy vehicles allowed", "Park at the top"],
    questionImage: signSteepHill,
    correctAnswer: 0, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-055", question: 'If you miss the turn at a T-junction shown by this sign, what should you do?',
    options: ["Reverse on the road", "Make a U-turn immediately", "Find a safe place to turn around", "Stop in the middle of the road"],
    questionImage: signTJunction,
    correctAnswer: 2, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-056", question: 'This sign at a construction site means you should:',
    options: ["Drive at normal speed", "Slow down and follow detour signs", "Honk to warn workers", "Overtake other vehicles quickly"],
    questionImage: signConstruction,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-057", question: 'What does this sign tell you about oncoming traffic?',
    options: ["Traffic flows one way only", "Expect vehicles from the opposite direction", "Road is closed", "No vehicles allowed"],
    questionImage: signTwoWay,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-058", question: 'At a roundabout indicated by this sign, you should:',
    options: ["Speed up and enter", "Give way to traffic already in the roundabout", "Stop completely before entering", "Honk before entering"],
    questionImage: signRoundabout,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-059", question: 'This sign near a school means:',
    options: ["Schools are closed", "Drive slowly, children may be crossing", "Parking for school buses only", "No children allowed"],
    questionImage: signSchoolZone,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-060", question: 'What is the penalty for ignoring this sign?',
    options: ["No penalty", "Warning only", "Traffic fine or points on license", "Vehicle impoundment"],
    questionImage: signNoEntry,
    correctAnswer: 2, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-061", question: 'This sign combined with a speed limit means:',
    options: ["Go as fast as you want", "Speed cameras are ahead", "Maximum speed allowed in the zone", "Minimum speed required"],
    questionImage: signSpeedLimit,
    correctAnswer: 2, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-062", question: 'What should you do before the railway crossing shown by this sign?',
    options: ["Speed up to cross quickly", "Stop, look and listen", "Honk three times", "Flash your headlights"],
    questionImage: signRailway,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-063", question: 'This sign indicates you must:',
    options: ["Turn left", "Keep to the left side", "No left turn", "Merge left"],
    questionImage: signKeepLeft,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-064", question: 'Driving past this sign while a train is approaching is:',
    options: ["Acceptable if you are fast", "Extremely dangerous and illegal", "Only illegal at night", "Allowed for emergency vehicles"],
    questionImage: signRailway,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-065", question: 'What must you do when this sign has flashing lights?',
    options: ["Proceed with caution", "Stop immediately", "Speed up", "Change lanes"],
    questionImage: signSchoolZone,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-066", question: 'How far before the hazard is this sign typically placed?',
    options: ['5 metres', '50-100 metres', '500 metres', '1 kilometre'],
    questionImage: signCurve,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-067", question: 'Which vehicles are most affected by this sign?',
    options: ["Motorcycles only", "Trucks and heavy vehicles", "Only bicycles", "Only pedestrians"],
    questionImage: signNarrowBridge,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-068", question: 'This sign on a highway means:',
    options: ["Highway is ending", "No lane changing", "No overtaking allowed", "Speed up zone"],
    questionImage: signNoOvertaking,
    correctAnswer: 2, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-069", question: 'What is the correct response to this sign at night?',
    options: ["Turn off your lights", "Slow down and use low beams", "Flash high beams", "Speed up with high beams"],
    questionImage: signCurve,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-070", question: 'If this sign appears on a wet road, you should:',
    options: ["Maintain high speed", "Brake hard", "Reduce speed gradually", "Swerve to avoid water"],
    questionImage: signSlipperyRoad,
    correctAnswer: 2, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-071", question: 'This sign at a hospital zone requires you to:',
    options: ["Speed up past the hospital", "Reduce speed and avoid noise", "Park anywhere", "Use your horn to warn patients"],
    questionImage: signHospital,
    correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-072", question: 'Which of these signs means the road is a dead end?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signNoEntry, signStop, signDeadEnd, signTJunction], correctAnswer: 2, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-073", question: 'Which two signs both warn about turning restrictions?',
    options: ["Signs A & D", "Signs B & C", "Signs C & D", "Signs A & B"], imageOptions: [signNoParking, signNoRightTurn, signNoHorn, signNoLeftTurn], correctAnswer: 3, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-074", question: 'Which sign would you see near a level crossing with no barriers?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signRailway, signStop, signTrafficLight, signYield], correctAnswer: 0, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-075", question: 'Which of these signs is NOT a prohibition sign?',
    options: ["Sign A", "Sign B", "Sign D", "Sign C"], imageOptions: [signNoEntry, signNoHorn, signNoParking, signFallingRocks], correctAnswer: 3, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-076", question: 'Which of these signs is triangular?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signStop, signAnimalCrossing, signNoEntry, signParking], correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-077", question: 'Which sign warns about a road hazard related to weather?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signConstruction, signRoadNarrows, signFallingRocks, signSlipperyRoad], correctAnswer: 3, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-078", question: 'Which signs should make you reduce your speed?',
    options: ["Only Sign A", "All of them", "Signs A and B only", "None of them"], imageOptions: [signCurve, signSchoolZone, signParking, signOneWay], correctAnswer: 1, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-079", question: 'Which sign is typically blue or green in colour?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signHospital, signNoEntry, signStop, signYield], correctAnswer: 0, category: 'road-markings', difficulty: 'medium',
  },
  {
    id: "img3-080", question: 'Which sign would be found at the entrance of a residential area?',
    options: ["Sign D", "Sign B", "Sign C", "Sign A"], imageOptions: [signRailway, signNoEntry, signConstruction, signSpeedLimit], correctAnswer: 3, category: 'road-markings', difficulty: 'medium',
  },

  // --- HARD (40 questions) ---
  {
    id: "img3-081", question: 'In the Vienna Convention, what colour background does this warning sign category use?',
    options: ["Red", "Yellow or white", "Blue", "Green"],
    questionImage: signFallingRocks,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-082", question: 'According to road sign classifications, which category does this belong to?',
    options: ["Mandatory sign", "Informatory sign", "Prohibitory/regulatory sign", "Warning sign"],
    questionImage: signNoHorn,
    correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-083", question: 'What is the international standard shape for this type of prohibition sign?',
    options: ["Triangle", "Square", "Circle with red border", "Octagon"],
    questionImage: signNoRightTurn,
    correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-084", question: 'In countries that drive on the left, which sign replaces this one?',
    options: ["Keep right sign", "No right turn", "One way (right)", "Roundabout"],
    questionImage: signKeepLeft,
    correctAnswer: 0, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-085", question: 'What is the recommended following distance when you see this sign?',
    options: ['1 second', '2 seconds', '4-6 seconds (double normal)', '10 seconds'],
    questionImage: signSlipperyRoad,
    correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-086", question: 'At what gradient percentage is this sign typically installed?',
    options: ['2-3%', '5-7%', '8% or more', '15% minimum'],
    questionImage: signSteepHill,
    correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-087", question: 'In Nigeria (FRSC standards), how far before a hazard is this sign placed on rural roads?',
    options: ['10-20m', '50-80m', '100-200m', '500m'],
    questionImage: signCurve,
    correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-088", question: 'What is the legal penalty for violating this sign in most countries?',
    options: ["Verbal warning only", "Fine and possible license points", "Immediate license revocation", "No legal consequences"],
    questionImage: signNoEntry,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-089", question: 'Which international standard governs the design of this type of road sign?',
    options: ["ISO 9001", "Vienna Convention on Road Signs", "Geneva Convention", "Kyoto Protocol"],
    questionImage: signStop,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-090", question: 'The STOP sign is unique because its shape is:',
    options: ["Circle", "Triangle", "Octagon (8 sides)", "Pentagon"],
    questionImage: signStop,
    correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-091", question: 'What does retroreflectivity mean for this type of sign?',
    options: ["It glows in the dark permanently", "It reflects headlight beams back to the driver at night", "It changes colour in rain", "It emits a sound warning"],
    questionImage: signTrafficLight,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-092", question: 'Which agency is responsible for road sign standards in Nigeria?',
    options: ["LASTMA", "FRSC", "NPA", "NIMASA"],
    questionImage: signRoundabout,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-093", question: 'What supplementary sign often accompanies this warning sign?',
    options: ["Speed limit sign", "Distance plate showing how far ahead", "Parking sign", "Direction arrow"],
    questionImage: signRailway,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-094", question: 'In terms of sign hierarchy, which sign takes precedence?',
    options: ["Road markings", "Traffic lights", "Police officer direction", "Permanent signs"],
    questionImage: signTrafficLight,
    correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-095", question: 'What is the standard height for mounting this type of sign on urban roads?',
    options: ['0.5-1m', '1.5-2.1m', '3-4m', '5m or above'],
    questionImage: signSpeedLimit,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-096", question: 'Which sign colour indicates mandatory instruction (not warning)?',
    options: ["Red circle", "Yellow triangle", "Blue circle", "Green rectangle"],
    questionImage: signKeepLeft,
    correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-097", question: 'What is the minimum sign size for this type of sign on a highway?',
    options: ['300mm', '450mm', '600mm or larger', '900mm minimum'],
    questionImage: signNoOvertaking,
    correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-098", question: 'When two contradictory signs appear, which takes priority?',
    options: ["The older sign", "The larger sign", "The most recently installed sign", "The temporary sign"],
    questionImage: signConstruction,
    correctAnswer: 3, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-099", question: 'What is the design standard for the red border width on prohibition signs?',
    options: ['5% of sign diameter', "10% of sign diameter", "One-eighth of sign diameter", 'Any width'],
    questionImage: signNoHorn,
    correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-100", question: 'How is this sign different from a No Through Road sign?',
    options: ["They are identical", "Dead end has no exit; no through road may have pedestrian exit", "No through road is only for trucks", "Dead end is temporary"],
    questionImage: signDeadEnd,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-101", question: 'What is the chevron alignment sign used alongside this warning?',
    options: ["To mark curve severity", "To indicate speed bumps", "To show parking spots", "To mark school zones"],
    questionImage: signCurve,
    correctAnswer: 0, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-102", question: 'What type of road marking accompanies this sign on the road surface?',
    options: ["Double yellow lines", "Zigzag lines", "Hatched markings", "Solid white line"],
    questionImage: signSchoolZone,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-103", question: 'Which reflective sheeting grade is required for this sign on expressways?',
    options: ["Type I (Engineering Grade)", "Type III (High Intensity)", "Type IX (Diamond Grade)", "No reflectivity needed"],
    questionImage: signStop,
    correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-104", question: 'What additional sign typically appears 200m before this sign?',
    options: ["Advance warning sign of the same type", "A parking sign", "A speed bump sign", "A hospital sign"],
    questionImage: signRailway,
    correctAnswer: 0, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-105", question: 'In traffic engineering, what is the 85th percentile speed used for with this sign?',
    options: ["Determining speed limit", "Setting sign height", "Choosing sign colour", "Deciding sign location only"],
    questionImage: signSpeedLimit,
    correctAnswer: 0, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-106", question: 'What material are modern versions of this sign typically made from?',
    options: ["Wood", "Cast iron", "Aluminum with reflective sheeting", "Plastic only"],
    questionImage: signYield,
    correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-107", question: 'What does MUTCD stand for in road sign standards?',
    options: ["Manual on Uniform Traffic Control Devices", "Ministry of Urban Traffic Control Division", "Municipal Unified Transport Code Document", "Manual of Urban Transit Crossing Design"],
    questionImage: signNoEntry,
    correctAnswer: 0, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-108", question: 'What is the breakaway support mechanism for this type of sign post?',
    options: ["It stays rigid on impact", "Post breaks away to reduce injury on vehicle impact", "Post bends but does not break", "Post is buried underground"],
    questionImage: signRoadNarrows,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-109", question: 'Which sign would require a flashing beacon attachment in poor visibility?',
    options: ["Sign A", "Sign D", "Sign C", "Sign B"], imageOptions: [signParking, signHospital, signOneWay, signRailway], correctAnswer: 3, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-110", question: 'Which sign pair indicates a zone where both turning and parking are restricted?',
    options: ["Signs A & B", "Signs B & C", "Signs C & D", "Signs A & D"], imageOptions: [signNoLeftTurn, signNoParking, signParking, signBicycle], correctAnswer: 0, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-111", question: 'Which of these signs requires the highest retroreflectivity rating?',
    options: ["Sign A", "Sign C", "Sign B", "Sign D"], imageOptions: [signParking, signHospital, signStop, signBicycle], correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-112", question: 'In the Warrant Analysis for this sign, which factor is most critical?',
    options: ["Aesthetics", "Traffic volume and accident history", "Proximity to restaurants", "Sign manufacturer recommendation"],
    questionImage: signTrafficLight,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-113", question: 'What is the conspicuity of a road sign?',
    options: ["Its weight", "How easily it can be seen and noticed by drivers", "Its cost", "Its legal authority"],
    questionImage: signFallingRocks,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-114", question: 'What is the coefficient of retroreflection (RA) measured in?',
    options: ["Lumens", "Candelas per lux per square metre", "Watts", "Decibels"],
    questionImage: signNoEntry,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-115", question: 'Which sign is classified as a regulatory sign under MUTCD?',
    options: ["Sign C", "Sign B", "Sign A", "Sign D"], imageOptions: [signNoUturn, signFallingRocks, signCurve, signAnimalCrossing], correctAnswer: 0, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-116", question: 'Which country first standardized the octagonal STOP sign shape?',
    options: ["United Kingdom", "France", "United States", "Germany"],
    questionImage: signStop,
    correctAnswer: 2, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-117", question: 'What is the decision sight distance related to this sign?',
    options: ["Distance to read the sign text", "Distance needed to detect, recognize, decide and act", "Distance between two signs", "Distance from sign to intersection"],
    questionImage: signTJunction,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-118", question: 'In smart road systems, this sign may be replaced by:',
    options: ["Nothing - it is always needed", "Variable Message Signs (VMS)", "Speed bumps only", "Painted road markings only"],
    questionImage: signSpeedLimit,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-119", question: 'What does sign clutter mean in traffic engineering?',
    options: ["Signs that are dirty", "Too many signs in one location reducing effectiveness", "Signs placed too high", "Signs without reflectivity"],
    questionImage: signConstruction,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
  {
    id: "img3-120", question: 'What is the purpose of a delineator post alongside this type of sign?',
    options: ["To hold advertising", "To guide drivers along the road edge at night", "To block pedestrians", "To mark parking spaces"],
    questionImage: signCurve,
    correctAnswer: 1, category: 'road-markings', difficulty: 'hard',
  },
];
