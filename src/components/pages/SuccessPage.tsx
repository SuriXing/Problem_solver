import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTypeSafeTranslation } from '../../utils/translationHelper';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faEye, faCopy, faHome, faHandsHelping, faCircleInfo, faShare } from '@fortawesome/free-solid-svg-icons';
import StorageSystem, { UserData } from '../../utils/StorageSystem';
import styles from './SuccessPage.module.css';
import { useTranslation } from 'react-i18next';

const SuccessPage: React.FC = () => {
  const { t } = useTypeSafeTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Get access code from location state
  useEffect(() => {
    console.log('Location state:', location.state);
    
    // First try to get from location state (direct navigation from form submission)
    if (location.state?.accessCode) {
      console.log('Access code from location state:', location.state.accessCode);
      setAccessCode(location.state.accessCode);
      localStorage.setItem('accessCode', location.state.accessCode);
    } else {
      // Fall back to localStorage (when returning to the page)
      const storedAccessCode = localStorage.getItem('accessCode');
      
      if (storedAccessCode) {
        console.log('Access code from localStorage:', storedAccessCode);
        setAccessCode(storedAccessCode);
      } else {
        console.warn('No access code found in state or localStorage');
      }
    }
    
    // Try to get user data
    const fetchUserData = async () => {
      const storedCode = location.state?.accessCode || localStorage.getItem('accessCode');
      if (storedCode) {
        const data = await StorageSystem.retrieveData(storedCode);
        if (data) {
          setUserData(data);
        }
      }
    };
    
    fetchUserData();
  }, [location.state]);
  
  // Copy access code to clipboard
  const copyAccessCode = () => {
    navigator.clipboard.writeText(accessCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  // View post - redirects to past-questions page
  const viewPost = () => {
    // Store the access code in session storage
    sessionStorage.setItem('temp_access_code', accessCode);
    // Navigate to the past questions page without exposing the code in URL
    window.location.href = '/past-questions';
  };
  
  // Share function to use the proper share page URL
  const sharePost = () => {
    const shareUrl = `${window.location.origin}/share/${accessCode}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const { t: i18nT } = useTranslation();

  function renderTag(tag: string) {
    return i18nT(`tag${tag.charAt(0).toUpperCase() + tag.slice(1)}`, tag);
  }

  return (
    <section className={styles.successView}>
      <div className={styles.successHeader}>
        <div className={styles.successIcon}>
          <FontAwesomeIcon icon={faCircleCheck} />
        </div>
        <h1 className={styles.successTitle}>{t('thankYouTitle')}</h1>
        <p className={styles.successSubtitle}>{t('thankYouSubtitle')}</p>
      </div>
      
      <div className={styles.accessCodeContainer}>
        <h2 className={styles.accessCodeTitle}>{t('yourAccessCode')}</h2>
        <div className={styles.accessCodeDisplay}>
          <span id="access-code">{accessCode}</span>
          <button 
            className={`${styles.copyCodeBtn} ${copied ? styles.copied : ''}`} 
            onClick={copyAccessCode}
            title={copied ? t('copied') : t('copyAccessCode')}
          >
            <FontAwesomeIcon icon={faCopy} />
          </button>
        </div>
        <p className={styles.accessCodeDesc}>{t('saveAccessCode')}</p>
        <button id="view-post-btn" className={styles.viewPostBtn} onClick={viewPost}>
          <FontAwesomeIcon icon={faEye} /> <span>{t('viewMyPost')}</span>
        </button>
      </div>
      
      {userData && (
        <div className={styles.successMessage}>
          <div className={styles.messageCard}>
            <div className={styles.messageInfo}>
              <div className={styles.messageMeta}>
                <span className={styles.messageAuthor}>
                  <FontAwesomeIcon icon={faCircleCheck} /> 
                  <span>{t('yourAnonymousId')}</span>
                  <span id="user-id">{userData.userId}</span>
                </span>
                <span className={styles.messageTime}>{t('justPosted')}</span>
              </div>
              <div className={styles.messageContent}>
                <p id="confession-preview">{userData.confessionText}</p>
              </div>
              <div className={styles.messageTags} id="confession-tags">
                {userData.selectedTags.map((tag, index) => (
                  <span key={index} className={styles.tag}>{renderTag(tag)}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className={styles.successActions}>
        <p className={styles.notificationInfo}>{t('notifyMessage')}</p>
        <div className={styles.actionButtons}>
          <Link to="/" className={`${styles.returnHomeBtn}`}>
            <FontAwesomeIcon icon={faHome} /> <span>{t('returnHome')}</span>
          </Link>
          <Link to="/help" className={`${styles.helpBtn}`}>
            <FontAwesomeIcon icon={faHandsHelping} /> <span>{t('helpOthers')}</span>
          </Link>
        </div>
      </div>
      
      <div className={styles.successInfoBox}>
        <h3><FontAwesomeIcon icon={faCircleInfo} /> <span>{t('whatHappensNext')}</span></h3>
        <ul>
          <li>{t('communityWillSee')}</li>
          <li>{t('replyIn24h')}</li>
          <li>{t('emailNotification')}</li>
          <li>{t('checkWithCode')}</li>
        </ul>
      </div>
      
      <button className={styles.sharePostBtn} onClick={sharePost}>
        <FontAwesomeIcon icon={faShare} /> <span>{t('shareMyPost')}</span>
      </button>
    </section>
  );
};

export default SuccessPage; 