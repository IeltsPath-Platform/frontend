import type { User } from "@/types/auth"

export const CURRENT_STUDENT: User = {
  id: "user-current-student",
  fullName: "Nguyễn Minh Anh",
  email: "minh.anh@ieltspath.local",
  targetBand: 7.5,
  roles: ["CUSTOMER"],
  status: "ACTIVE",
  tier: "FREE",
  points: 120,
}

export const PREMIUM_STUDENT: User = {
  ...CURRENT_STUDENT,
  tier: "PREMIUM",
  points: 9999,
}

export const MOCK_USERS: User[] = [
  CURRENT_STUDENT,
  {
    id: "user-admin",
    fullName: "Trần Thu Hà",
    email: "admin@ieltspath.local",
    targetBand: 9,
    roles: ["ADMIN", "CONTENT_AUTHOR"],
    status: "ACTIVE",
  },
  {
    id: "user-examiner",
    fullName: "Lê Hoàng Nam",
    email: "examiner@ieltspath.local",
    targetBand: 8.5,
    roles: ["EXAMINER"],
    status: "ACTIVE",
  },
]
