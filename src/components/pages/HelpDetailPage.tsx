import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTypeSafeTranslation } from '../../utils/translationHelper';
import { 
  Card, 
  Button, 
  Divider,
  message,
} from 'antd';
import { 
  ArrowLeftOutlined,
  EyeOutlined,
  MessageOutlined
} from '@ant-design/icons';
import Layout from '../layout/Layout';
import '../../styles/HelpDetailPage.css';
import { DatabaseService } from '../../services/database.service';
import { Post, Reply as DatabaseReply } from '../../types/database.types';
import ReplyForm from '../ReplyForm';
import { getCurrentUserId } from '../../utils/authHelpers';
import { useTranslation } from 'react-i18next';

// Helper function to get time ago
const getTimeAgo = (timestamp: string, t: (key: string, options?: any) => string): string => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffMonths > 0) {
    return t('monthsAgo', { count: diffMonths });
  } else if (diffWeeks > 0) {
    return t('weeksAgo', { count: diffWeeks });
  } else if (diffDays > 0) {
    return t('daysAgo', { count: diffDays });
  } else if (diffHours > 0) {
    return t('hoursAgo', { count: diffHours });
  } else if (diffMins > 0) {
    return t('minutesAgo', { count: diffMins });
  } else {
    return t('justNow');
  }
};

const HelpDetailPage: React.FC = () => {
  const { accessCode } = useParams<{ accessCode: string }>();
  const { t } = useTypeSafeTranslation();
  const { t: i18nT } = useTranslation();
  
  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<DatabaseReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  
  // Wrap fetchPostAndReplies in useCallback to fix dependency issue
  const fetchPostAndReplies = useCallback(async () => {
    if (!accessCode) return;
    
    setLoading(true);
    try {
      // Fetch the post by access code
      const fetchedPost = await DatabaseService.getPostByAccessCode(accessCode);
      
      if (fetchedPost) {
        setPost(fetchedPost);
        
        // Increment view count
        await DatabaseService.incrementViewCount(fetchedPost.id);
        
        // Fetch replies for this post
        const fetchedReplies = await DatabaseService.getRepliesByPostId(fetchedPost.id);
        setReplies(fetchedReplies || []);
      } else {
        console.error('Post not found with access code:', accessCode);
        setError('Post not found');
      }
    } catch (err) {
      console.error('Error fetching post and replies:', err);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  }, [accessCode]); // Include accessCode in dependencies
  
  // Load post and replies on component mount
  useEffect(() => {
    if (accessCode) {
      fetchPostAndReplies();
    }
  }, [accessCode, fetchPostAndReplies]);
  
  // Get the current user ID when the component mounts
  useEffect(() => {
    async function getUserId() {
      const userId = await getCurrentUserId();
      setCurrentUserId(userId);
    }
    
    getUserId();
  }, []);
  
  // Handle marking a reply as solution
  const handleMarkAsSolution = async (replyId: string) => {
    if (!post) return;
    
    try {
      const success = await DatabaseService.markReplyAsSolution(post.id, replyId);
      
      if (success) {
        // Refresh the replies to show the updated solution status
        fetchPostAndReplies();
        message.success(t('markedAsSolution'));
      } else {
        message.error(t('errorMarkingSolution'));
      }
    } catch (err) {
      console.error('Error marking reply as solution:', err);
      message.error(t('errorMarkingSolution'));
    }
  };
  
  if (loading) {
    return (
      <Layout>
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1000 }}>
          <div className="loading-spinner"></div>
          <p style={{ marginTop: 16 }}>{t('loadingPosts')}</p>
        </div>
      </Layout>
    );
  }
  
  if (!post) {
    return (
      <Layout>
        <div className="error-container">
          <h2>{t('postNotFound')}</h2>
          <p>{t('postNotFoundDesc')}</p>
          <Link to="/help">
            <Button type="primary">{t('backToHelp')}</Button>
          </Link>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
      <div className="help-detail-container">
        <Card className="post-card">
          <div className="post-header">
            <Link to="/help" className="back-link">
              <ArrowLeftOutlined /> {t('backToHelp')}
            </Link>
            
            <div className="post-meta">
              <span className="post-time">{getTimeAgo(post.created_at, t)}</span>
            </div>
            
            <div className="post-stats">
              <span className="post-stat">
                <EyeOutlined /> {post.views || 0} {t('views')}
              </span>
              <span className="post-stat">
                <MessageOutlined /> {post.replies?.length || 0} {t('replies')}
              </span>
            </div>
          </div>
          
          <div className="post-title">
            {i18nT(`post.${post.id}.content`, { defaultValue: post.content })}
          </div>
          
          <div className="post-tags">
            {post.tags.map(tag => (
              <span key={tag} className="post-tag">
                {i18nT(`tag.${tag}`, { defaultValue: tag })}
              </span>
            ))}
          </div>
          
          <Divider>{t('replies')} ({replies.length})</Divider>
          
          {/* Display replies */}
          <div className="replies-section">
            <h3>{t('replies')} ({replies.length})</h3>
            
            {replies.length === 0 ? (
              <p>{t('noRepliesYet')}</p>
            ) : (
              replies.map(reply => (
                <div key={reply.id} className="replyItem">
                  <div className="reply-content">{reply.content}</div>
                  {/* If reply has tags, render them translated */}
                  {Array.isArray((reply as any).tags) && (reply as any).tags.length > 0 && (
                    <div className="reply-tags">
                      {(reply as any).tags.map((tag: string) => (
                        <span key={tag} className="post-tag">
                          {i18nT(`tag.${tag}`, { defaultValue: tag })}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="reply-meta">
                    <span>{getTimeAgo(reply.created_at, t)}</span>
                    
                    {/* Show mark as solution button for post owner */}
                    {post?.user_id === currentUserId && !reply.is_solution && (
                      <Button 
                        size="small" 
                        onClick={() => handleMarkAsSolution(reply.id)}
                      >
                        {t('markAsSolution')}
                      </Button>
                    )}
                    
                    {reply.is_solution && (
                      <span className="solution-badge">{t('solution')}</span>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {/* Reply form */}
            <div className="reply-form-container">
              <h3>{t('addReply')}</h3>
              <ReplyForm 
                postId={post?.id || ''} 
                onReplyAdded={fetchPostAndReplies} 
              />
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default HelpDetailPage; 