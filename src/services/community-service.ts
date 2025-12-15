import { createWhopClient, createLogger, WhopApiError } from '../lib/index.js';

const logger = createLogger('CommunityService');

/**
 * Course content structure
 */
export interface CourseContent {
  title: string;
  description?: string;
  chapters: ChapterContent[];
}

/**
 * Chapter content structure
 */
export interface ChapterContent {
  title: string;
  description?: string;
  lessons: LessonContent[];
}

/**
 * Lesson content structure
 */
export interface LessonContent {
  title: string;
  content: string;
  videoUrl?: string;
  duration?: number; // in minutes
}

/**
 * Whop Course response
 */
interface WhopCourse {
  id: string;
  title: string;
  description?: string;
  experience_id: string;
  created_at: string;
}

/**
 * Whop Chapter response
 */
interface WhopChapter {
  id: string;
  course_id: string;
  title: string;
  order: number;
}

/**
 * Whop Lesson response
 */
interface WhopLesson {
  id: string;
  chapter_id: string;
  title: string;
  content: string;
  order: number;
}

/**
 * Whop Forum Post response
 */
interface WhopForumPost {
  id: string;
  feed_id: string;
  title?: string;
  content: string;
  user: {
    id: string;
    username: string;
  };
  is_pinned: boolean;
  created_at: string;
}

/**
 * Forum post options
 */
export interface PostOptions {
  title?: string;
  content: string;
  isPinned?: boolean;
}

/**
 * List posts options
 */
export interface ListPostsOptions {
  perPage?: number;
  after?: string;
  pinnedOnly?: boolean;
}

/**
 * Notification content
 */
export interface NotificationContent {
  title: string;
  body: string;
  url?: string;
  imageUrl?: string;
}

/**
 * Community Service for training, forums, and notifications
 */
export class CommunityService {
  private client = createWhopClient();

  // ==================== COURSES ====================

  /**
   * Create a complete course with chapters and lessons
   */
  async createCourse(
    experienceId: string,
    courseContent: CourseContent
  ): Promise<{
    course: WhopCourse;
    chapters: WhopChapter[];
    lessons: WhopLesson[];
  }> {
    logger.info('Creating course', {
      experienceId,
      title: courseContent.title,
      chapterCount: courseContent.chapters.length,
    });

    try {
      // Create course
      const course = await this.client.post<WhopCourse>('/courses', {
        experience_id: experienceId,
        title: courseContent.title,
        description: courseContent.description,
      });

      logger.info('Course created', { courseId: course.id });

      const chapters: WhopChapter[] = [];
      const lessons: WhopLesson[] = [];

      // Create chapters and lessons
      for (let i = 0; i < courseContent.chapters.length; i++) {
        const chapterContent = courseContent.chapters[i];

        const chapter = await this.client.post<WhopChapter>('/course_chapters', {
          course_id: course.id,
          title: chapterContent.title,
          description: chapterContent.description,
          order: i + 1,
        });

        logger.debug('Chapter created', { chapterId: chapter.id, title: chapter.title });
        chapters.push(chapter);

        // Create lessons for this chapter
        for (let j = 0; j < chapterContent.lessons.length; j++) {
          const lessonContent = chapterContent.lessons[j];

          const lesson = await this.client.post<WhopLesson>('/course_lessons', {
            chapter_id: chapter.id,
            title: lessonContent.title,
            content: lessonContent.content,
            video_url: lessonContent.videoUrl,
            order: j + 1,
          });

          logger.debug('Lesson created', { lessonId: lesson.id, title: lesson.title });
          lessons.push(lesson);
        }
      }

      logger.info('Course creation complete', {
        courseId: course.id,
        totalChapters: chapters.length,
        totalLessons: lessons.length,
      });

      return { course, chapters, lessons };
    } catch (error) {
      logger.error('Failed to create course', { error });
      throw error;
    }
  }

  /**
   * Get course details
   */
  async getCourse(courseId: string): Promise<WhopCourse> {
    logger.debug('Getting course', { courseId });
    return this.client.get<WhopCourse>(`/courses/${courseId}`);
  }

  /**
   * List courses for an experience
   */
  async listCourses(experienceId: string): Promise<WhopCourse[]> {
    logger.debug('Listing courses', { experienceId });

    const response = await this.client.get<{ data: WhopCourse[] }>('/courses', {
      experience_id: experienceId,
    });

    return response.data;
  }

  // ==================== FORUMS ====================

  /**
   * Create a forum post
   */
  async createPost(feedId: string, options: PostOptions): Promise<WhopForumPost> {
    logger.info('Creating forum post', { feedId, title: options.title });

    try {
      const post = await this.client.post<WhopForumPost>('/forum_posts', {
        feed_id: feedId,
        title: options.title,
        content: options.content,
        is_pinned: options.isPinned ?? false,
      });

      logger.info('Post created', { postId: post.id });
      return post;
    } catch (error) {
      logger.error('Failed to create post', { error });
      throw error;
    }
  }

  /**
   * List forum posts
   */
  async listPosts(feedId: string, options: ListPostsOptions = {}): Promise<{
    posts: WhopForumPost[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    logger.debug('Listing posts', { feedId, ...options });

    try {
      const params: Record<string, string | number | undefined> = {
        feed_id: feedId,
        per_page: options.perPage || 20,
        after: options.after,
      };

      const response = await this.client.get<{
        data: WhopForumPost[];
        pagination: { next_cursor?: string; has_more: boolean };
      }>('/forum_posts', params);

      let posts = response.data;

      // Filter pinned only if requested
      if (options.pinnedOnly) {
        posts = posts.filter((p) => p.is_pinned);
      }

      return {
        posts,
        nextCursor: response.pagination.next_cursor,
        hasMore: response.pagination.has_more,
      };
    } catch (error) {
      logger.error('Failed to list posts', { error });
      throw error;
    }
  }

  /**
   * Create an announcement (pinned post)
   */
  async createAnnouncement(feedId: string, title: string, content: string): Promise<WhopForumPost> {
    return this.createPost(feedId, {
      title,
      content,
      isPinned: true,
    });
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Send a notification to all members of an experience
   */
  async sendNotification(
    experienceId: string,
    notification: NotificationContent
  ): Promise<{ success: boolean; notificationId?: string }> {
    logger.info('Sending notification', { experienceId, title: notification.title });

    try {
      const result = await this.client.post<{ id: string }>('/notifications', {
        experience_id: experienceId,
        title: notification.title,
        body: notification.body,
        url: notification.url,
        image_url: notification.imageUrl,
      });

      logger.info('Notification sent', { notificationId: result.id });
      return { success: true, notificationId: result.id };
    } catch (error) {
      logger.error('Failed to send notification', { error });
      return { success: false };
    }
  }

  /**
   * Send notification to multiple experiences
   */
  async sendBulkNotification(
    experienceIds: string[],
    notification: NotificationContent
  ): Promise<{
    successful: number;
    failed: number;
    results: Array<{ experienceId: string; success: boolean; notificationId?: string }>;
  }> {
    logger.info('Sending bulk notification', {
      experienceCount: experienceIds.length,
      title: notification.title,
    });

    const results: Array<{ experienceId: string; success: boolean; notificationId?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const experienceId of experienceIds) {
      const result = await this.sendNotification(experienceId, notification);
      results.push({ experienceId, ...result });

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }

    logger.info('Bulk notification complete', { successful, failed });
    return { successful, failed, results };
  }

  // ==================== TEMPLATES ====================

  /**
   * Create a standard clipper onboarding course
   */
  async createClipperOnboarding(experienceId: string): Promise<{
    course: WhopCourse;
    chapters: WhopChapter[];
    lessons: WhopLesson[];
  }> {
    const onboardingContent: CourseContent = {
      title: 'Clipper Program Onboarding',
      description: 'Everything you need to know to succeed as a clipper',
      chapters: [
        {
          title: 'Getting Started',
          description: 'Introduction to the clipper program',
          lessons: [
            {
              title: 'Welcome to the Program',
              content: `
# Welcome!

Congratulations on joining our clipper program. This course will teach you everything you need to know to be successful.

## What You'll Learn
- How to find viral content
- Best practices for editing
- How to maximize your earnings
- Platform-specific tips

Let's get started!
              `.trim(),
            },
            {
              title: 'How the Program Works',
              content: `
# How It Works

## The Submission Process
1. Find or create compelling content
2. Submit your clip through the portal
3. Wait for review (usually within 48 hours)
4. Get paid based on views!

## Payment Structure
- CPM-based earnings (per 1,000 views)
- Flat fee bonuses for high-quality content
- Weekly payout cycles

## What We're Looking For
- Original, engaging content
- Proper formatting for each platform
- Compliance with community guidelines
              `.trim(),
            },
          ],
        },
        {
          title: 'Creating Great Clips',
          description: 'Tips for creating viral content',
          lessons: [
            {
              title: 'Finding Viral Moments',
              content: `
# Finding Viral Moments

## Key Indicators
- Emotional reactions
- Unexpected twists
- Relatable situations
- Controversial takes (within guidelines)

## Best Practices
- Watch content at 2x speed to scan quickly
- Note timestamps of potential clips
- Consider what makes YOU stop scrolling
- Think about shareability

## Tools
- Use clip detection software
- Track trending sounds/formats
- Monitor competitor accounts
              `.trim(),
            },
            {
              title: 'Editing Essentials',
              content: `
# Editing Essentials

## Technical Requirements
- Vertical format (9:16) for TikTok/Reels/Shorts
- High resolution (1080p minimum)
- Clear audio
- Proper aspect ratio

## Engagement Tips
- Hook viewers in first 2 seconds
- Add captions for accessibility
- Use trending sounds when appropriate
- Keep it concise (15-60 seconds ideal)

## Common Mistakes to Avoid
- Poor audio quality
- Unnecessary intro/outro
- Watermarks from other platforms
- Copyright violations
              `.trim(),
            },
          ],
        },
        {
          title: 'Maximizing Earnings',
          description: 'How to maximize your payout',
          lessons: [
            {
              title: 'Understanding the Algorithm',
              content: `
# Understanding the Algorithm

## Key Metrics
- Watch time (most important!)
- Engagement rate
- Share rate
- Comment quality

## Optimization Tips
- Post at optimal times
- Use relevant hashtags
- Engage with comments
- Create series content

## Platform Differences
- **TikTok**: Trend-driven, sound-focused
- **YouTube Shorts**: Longer shelf life
- **Instagram Reels**: Aesthetic quality matters
- **X/Twitter**: News/commentary focused
              `.trim(),
            },
            {
              title: 'Best Practices for Success',
              content: `
# Best Practices for Success

## Consistency
- Submit regularly
- Build a content calendar
- Track what works

## Quality Over Quantity
- Focus on your best clips
- Learn from rejections
- Iterate and improve

## Community
- Connect with other clippers
- Share tips and tricks
- Ask for feedback

## Stay Updated
- Watch for program announcements
- Adapt to platform changes
- Keep learning new techniques

Good luck and happy clipping!
              `.trim(),
            },
          ],
        },
      ],
    };

    return this.createCourse(experienceId, onboardingContent);
  }
}

/**
 * Create a CommunityService instance
 */
export function createCommunityService(): CommunityService {
  return new CommunityService();
}
