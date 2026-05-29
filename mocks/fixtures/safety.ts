import data from './safety.json'
export const MOCK_INCIDENTS = data.incidents
export const MOCK_HAZARDS = data.hazards
export const MOCK_INSPECTIONS = data.inspections
export const MOCK_TRAINING = data.training
export type { HazardReport, SafetyInspection, TrainingRecord } from './mock-types'
