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

Create `src/services/community-service.ts`:

```typescript
import { getWhopClient, createLogger } from '../lib/index.js';

const logger = createLogger('CommunityService');

// Whop Types
interface WhopCourse {
  id: string;
  experience_id: string;
  title: string;
  description?: string;
  visibility: 'visible' | 'hidden';
  chapters_count: number;
  lessons_count: number;
  created_at: string;
}

interface WhopChapter {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  position: number;
  lessons_count: number;
}

interface WhopLesson {
  id: string;
  chapter_id: string;
  title: string;
  description?: string;
  content_type: 'video' | 'text' | 'pdf' | 'quiz';
  position: number;
  duration_seconds?: number;
  video_url?: string;
  content?: string;
}

interface WhopForumPost {
  id: string;
  feed_id: string;
  title?: string;
  content: string;
  author: {
    id: string;
    username: string;
  };
  is_pinned: boolean;
  comments_count: number;
  created_at: string;
}

interface NotificationResult {
  success: boolean;
  recipients_count?: number;
}

export interface CourseContent {
  title: string;
  description?: string;
  chapters: {
    title: string;
    description?: string;
    lessons: {
      title: string;
      type: 'video' | 'text' | 'pdf' | 'quiz';
      content?: string;
      videoUrl?: string;
      duration?: number;
    }[];
  }[];
}

export class CommunityService {
  private client = getWhopClient();

  // ========== COURSES ==========

  /**
   * Create a complete training course with chapters and lessons
   */
  async createCourse(
    experienceId: string,
    courseContent: CourseContent
  ): Promise<WhopCourse> {
    logger.info('Creating course', { title: courseContent.title });

    // Create the course
    const courseResponse = await this.client.post<WhopCourse>('/courses', {
      experience_id: experienceId,
      title: courseContent.title,
      description: courseContent.description,
      visibility: 'visible',
    });

    const course = courseResponse.data;
    logger.info('Course created', { id: course.id });

    // Create chapters and lessons
    for (let i = 0; i < courseContent.chapters.length; i++) {
      const chapterData = courseContent.chapters[i];
      
      const chapterResponse = await this.client.post<WhopChapter>('/course_chapters', {
        course_id: course.id,
        title: chapterData.title,
        description: chapterData.description,
        position: i + 1,
      });

      const chapter = chapterResponse.data;
      logger.debug('Chapter created', { id: chapter.id, title: chapter.title });

      // Create lessons for this chapter
      for (let j = 0; j < chapterData.lessons.length; j++) {
        const lessonData = chapterData.lessons[j];
        
        await this.client.post<WhopLesson>('/course_lessons', {
          chapter_id: chapter.id,
          title: lessonData.title,
          content_type: lessonData.type,
          content: lessonData.content,
          video_url: lessonData.videoUrl,
          duration_seconds: lessonData.duration,
          position: j + 1,
        });

        logger.debug('Lesson created', { title: lessonData.title });
      }
    }

    logger.info('Course fully created', { 
      courseId: course.id,
      chapters: courseContent.chapters.length,
      lessons: courseContent.chapters.reduce((sum, c) => sum + c.lessons.length, 0),
    });

    return course;
  }

  /**
   * Get course details
   */
  async getCourse(courseId: string): Promise<WhopCourse> {
    const response = await this.client.get<WhopCourse>(`/courses/${courseId}`);
    return response.data;
  }

  /**
   * List courses for an experience
   */
  async listCourses(experienceId: string): Promise<WhopCourse[]> {
    const response = await this.client.get<WhopCourse[]>('/courses', {
      experience_id: experienceId,
    });
    return response.data;
  }

  /**
   * Update course visibility
   */
  async updateCourse(
    courseId: string,
    updates: { title?: string; description?: string; visibility?: 'visible' | 'hidden' }
  ): Promise<WhopCourse> {
    const response = await this.client.patch<WhopCourse>(`/courses/${courseId}`, updates);
    return response.data;
  }

  // ========== FORUMS ==========

  /**
   * Create a forum post (announcement)
   */
  async createPost(
    feedId: string,
    content: {
      title?: string;
      body: string;
      isPinned?: boolean;
    }
  ): Promise<WhopForumPost> {
    logger.info('Creating forum post', { feedId, title: content.title });

    const response = await this.client.post<WhopForumPost>('/forum_posts', {
      feed_id: feedId,
      title: content.title,
      content: content.body,
      is_pinned: content.isPinned ?? false,
    });

    logger.info('Post created', { id: response.data.id });
    return response.data;
  }

  /**
   * List forum posts
   */
  async listPosts(
    feedId: string,
    options?: { cursor?: string; limit?: number }
  ): Promise<{
    posts: WhopForumPost[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const query: Record<string, string | number> = {
      feed_id: feedId,
      per_page: options?.limit ?? 20,
    };
    if (options?.cursor) query.after = options.cursor;

    const response = await this.client.get<WhopForumPost[]>('/forum_posts', query);

    return {
      posts: response.data,
      hasMore: response.pageInfo?.hasNextPage ?? false,
      nextCursor: response.pageInfo?.endCursor,
    };
  }

  /**
   * Update a forum post
   */
  async updatePost(
    postId: string,
    updates: { title?: string; content?: string; isPinned?: boolean }
  ): Promise<WhopForumPost> {
    const response = await this.client.patch<WhopForumPost>(`/forum_posts/${postId}`, {
      title: updates.title,
      content: updates.content,
      is_pinned: updates.isPinned,
    });
    return response.data;
  }

  // ========== NOTIFICATIONS ==========

  /**
   * Send notification to users in an experience
   */
  async sendNotification(
    experienceId: string,
    notification: {
      title: string;
      body: string;
      url?: string;
    }
  ): Promise<NotificationResult> {
    logger.info('Sending notification', { experienceId, title: notification.title });

    const response = await this.client.post<NotificationResult>('/notifications', {
      experience_id: experienceId,
      title: notification.title,
      body: notification.body,
      url: notification.url,
    });

    logger.info('Notification sent', { success: response.data.success });
    return response.data;
  }

  /**
   * Send bulk notifications (e.g., campaign announcements)
   */
  async sendBulkNotification(
    experienceIds: string[],
    notification: {
      title: string;
      body: string;
      url?: string;
    }
  ): Promise<{ successful: string[]; failed: string[] }> {
    logger.info('Sending bulk notifications', { count: experienceIds.length });

    const results = {
      successful: [] as string[],
      failed: [] as string[],
    };

    for (const experienceId of experienceIds) {
      try {
        await this.sendNotification(experienceId, notification);
        results.successful.push(experienceId);
      } catch (error) {
        logger.error('Notification failed', error as Error, { experienceId });
        results.failed.push(experienceId);
      }
    }

    return results;
  }

  // ========== CLIPPER TRAINING TEMPLATES ==========

  /**
   * Create standard clipper onboarding course
   */
  async createClipperOnboarding(experienceId: string): Promise<WhopCourse> {
    const onboardingContent: CourseContent = {
      title: 'Clipper Onboarding',
      description: 'Everything you need to start earning as a clipper',
      chapters: [
        {
          title: 'Getting Started',
          description: 'Welcome to the clipper program',
          lessons: [
            {
              title: 'Welcome & Overview',
              type: 'text',
              content: `# Welcome to the Clipper Program!

## What You'll Learn
- How the clipper program works
- How to submit content
- How payouts are calculated
- Best practices for success

## Quick Start
1. Review the guidelines below
2. Start clipping content
3. Submit your best work
4. Get paid for views!`,
            },
            {
              title: 'Platform Guidelines',
              type: 'text',
              content: `# Platform Guidelines

## Approved Platforms
- TikTok
- YouTube Shorts
- Instagram Reels
- X (Twitter)

## Content Requirements
- Original editing work
- Must include brand attribution
- No misleading titles
- Family-friendly content only

## Prohibited Content
- Spam or clickbait
- Purchased views/engagement
- Content from other campaigns`,
            },
          ],
        },
        {
          title: 'Submission Process',
          description: 'How to submit your clips',
          lessons: [
            {
              title: 'How to Submit',
              type: 'text',
              content: `# Submission Process

## Step-by-Step Guide

### 1. Create Your Clip
- Download source content
- Edit using your preferred tools
- Add hooks, captions, effects

### 2. Post to Platform
- Upload within 1 hour of editing
- Use appropriate hashtags
- Include any required mentions

### 3. Submit URL
- Copy the post URL
- Submit through the portal
- Upload media file as backup

### 4. Wait for Review
- AI checks for fraud/bots
- Manual review if flagged
- Auto-approve after 48 hours`,
            },
            {
              title: 'Payout Structure',
              type: 'text',
              content: `# How Payouts Work

## CPM Model
- Paid per 1,000 verified views
- Rates vary by campaign
- Check campaign details for rates

## Example Calculation
- 50,000 views at $2 CPM
- Payout: (50,000 / 1,000) × $2 = $100

## Important Notes
- Minimum payout threshold applies
- Maximum per-submission cap
- Payouts process hourly
- Withdrawals available at $10+`,
            },
          ],
        },
        {
          title: 'Tips for Success',
          description: 'Maximize your earnings',
          lessons: [
            {
              title: 'Hook Optimization',
              type: 'text',
              content: `# Creating Killer Hooks

## The First 3 Seconds
The hook determines 90% of your video's success.

## Hook Formulas That Work
1. **The Question**: "Did you know..."
2. **The Shock**: Start with the climax
3. **The Promise**: "Here's how to..."
4. **The Controversy**: Challenge assumptions

## Technical Tips
- Large, readable text
- Fast cuts (0.5-1s)
- Sound effects on beat
- Face in frame when possible`,
            },
            {
              title: 'Volume Strategy',
              type: 'text',
              content: `# Scaling Your Output

## Recommended Volume
- 5-10 clips per day
- Across multiple campaigns
- Test different styles

## Efficiency Tools
- Opus Clip (AI clipping)
- CapCut (mobile editing)
- SendShort (batch upload)

## One Video, Many Clips
From a single source video:
- Different hooks
- Different lengths
- Different platforms
- Different music

One source = 10+ unique clips`,
            },
          ],
        },
      ],
    };

    return this.createCourse(experienceId, onboardingContent);
  }
}

// Singleton
let serviceInstance: CommunityService | null = null;

export function getCommunityService(): CommunityService {
  if (!serviceInstance) {
    serviceInstance = new CommunityService();
  }
  return serviceInstance;
}
```

### Task 2: Create Community CLI Commands

Create `src/cli/community-cli.ts`:

```typescript
import { getCommunityService } from '../services/community-service.js';
import { logger } from '../lib/index.js';

const service = getCommunityService();

export async function createOnboardingCommand(experienceId: string): Promise<void> {
  try {
    const course = await service.createClipperOnboarding(experienceId);

    console.log('\n📚 Onboarding Course Created!\n');
    console.log(`Course ID: ${course.id}`);
    console.log(`Title: ${course.title}`);
    console.log(`Chapters: ${course.chapters_count}`);
    console.log(`Lessons: ${course.lessons_count}`);
  } catch (error) {
    logger.error('Failed to create onboarding', error as Error);
    process.exit(1);
  }
}

export async function postAnnouncementCommand(
  feedId: string,
  title: string,
  body: string,
  pinned: boolean = false
): Promise<void> {
  try {
    const post = await service.createPost(feedId, {
      title,
      body,
      isPinned: pinned,
    });

    console.log('\n📢 Announcement Posted!\n');
    console.log(`Post ID: ${post.id}`);
    console.log(`Title: ${post.title}`);
    console.log(`Pinned: ${post.is_pinned ? 'Yes' : 'No'}`);
  } catch (error) {
    logger.error('Failed to post announcement', error as Error);
    process.exit(1);
  }
}

export async function sendNotificationCommand(
  experienceId: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const result = await service.sendNotification(experienceId, {
      title,
      body,
    });

    if (result.success) {
      console.log('\n🔔 Notification Sent!\n');
      console.log(`Title: ${title}`);
    } else {
      console.log('\n❌ Notification Failed');
    }
  } catch (error) {
    logger.error('Failed to send notification', error as Error);
    process.exit(1);
  }
}
```

### Task 3: Update Services Index

Update `src/services/index.ts`:

```typescript
export { CampaignService, getCampaignService } from './campaign-service.js';
export { 
  SubmissionService, 
  getSubmissionService,
  type SubmissionFilters,
} from './submission-service.js';
export { QueueProcessor, createQueueProcessor } from './queue-processor.js';
export {
  PayoutService,
  getPayoutService,
  PayoutError,
  type PayoutRequest,
  type PayoutResult,
} from './payout-service.js';
export {
  CommunityService,
  getCommunityService,
  type CourseContent,
} from './community-service.js';
```

---

## Success Criteria

- [ ] `createCourse` builds complete course structure
- [ ] Chapters and lessons are created in correct order
- [ ] Forum posts support pinning
- [ ] Notifications send successfully
- [ ] Onboarding template creates useful content

---

## Completion Template

Create `PLANNING/implementation-phases/PHASE-5-COMPLETE.md`:

```markdown
# Phase 5 Complete

**Completed:** [DATE]

## Implemented
- [x] CommunityService with courses
- [x] Forum post management
- [x] Notification system
- [x] Clipper onboarding template
- [x] CLI commands for community

## API Endpoints Used
- create_courses ✅
- create_course_chapters ✅
- create_course_lessons ✅
- create_forum_posts ✅
- list_forum_posts ✅
- create_notifications ✅

## Next Phase
Read `PLANNING/implementation-phases/PHASE-6-PROMPT.md`
```

---

## Git Commit

```bash
git add -A
git commit -m "feat(phase-5): Community features complete

- Implement CommunityService with course creation
- Add forum post management
- Create notification system
- Build clipper onboarding template
- Add CLI commands for community management

Ready for Phase 6: Integration & Testing"
```
