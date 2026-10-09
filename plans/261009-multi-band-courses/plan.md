# Multi-band courses (learn flow)

## Requirements
1. Nav: "Khóa học Intensive 7.0" → "Khóa học" (no hardcode band).
2. `/learn`: courses by `bandLevel` from GET `/courses` — polish CourseList in existing `--lp-*` style.
3. Course → topics → lessons → practice/review/test (existing); course final test when AVAILABLE.
4. Wire `POST /courses/{id}/test-assignments` + attempt + poll courses on pass.
5. Keep IELTSPath palette; no YouPass skin; no auth/placement regress.

## Plan
1. SiteNavbar labels → "Khóa học".
2. LearningApi + http + mock: `createCourseTestAssignment`; `StartAttemptRequest` + `COURSE_TEST`.
3. CourseListPage: band/progress/recommended/testStatus CTA clarity.
4. TopicListPage: CourseFinalTestCard (AVAILABLE → start attempt `?course=`).
5. TopicTestResultPage: poll `listCourses` when `course` query; CTA back to course/list.
6. Verify: typecheck + build.
