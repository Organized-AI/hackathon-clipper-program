# Phase 5: Community & Training Features

**Phase:** 5 of 6  
**Name:** Community Features  
**Dependencies:** Phase 1 (Core Infrastructure)

---

## Context

This phase adds community engagement features: clipper training courses, forum discussions, and notification systems. These features help onboard and retain clippers.

---

## Whop API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `create_courses` | Create training modules |
| `create_course_chapters` | Organize course content |
| `create_course_lessons` | Add individual lessons |
| `create_forum_posts` | Post announcements |
| `list_forum_posts` | Read discussions |
| `create_notifications` | Alert clippers |

---

## Tasks

### Task 1: Create Community Service

Create `src/services/community-service.ts` with:
- createCourse(experienceId, courseContent)
- getCourse(courseId)
- listCourses(experienceId)
- createPost(feedId, content)
- listPosts(feedId, options)
- sendNotification(experienceId, notification)
- sendBulkNotification(experienceIds, notification)
- createClipperOnboarding(experienceId) - template course

### Task 2: Create Community CLI Commands

Create `src/cli/community-cli.ts` with:
- createOnboardingCommand
- postAnnouncementCommand
- sendNotificationCommand

---

## Success Criteria

- [ ] `createCourse` builds complete course structure
- [ ] Chapters and lessons are created in correct order
- [ ] Forum posts support pinning
- [ ] Notifications send successfully

---

## Git Commit

```bash
git commit -m "feat(phase-5): Community features complete"
```