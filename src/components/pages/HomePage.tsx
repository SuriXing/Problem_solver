import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTypeSafeTranslation } from '../../utils/translationHelper';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandsHelping, faComments, faCrown } from '@fortawesome/free-solid-svg-icons';
import Layout from '../layout/Layout';
import '../../styles/HomePage.css';

const HomePage: React.FC = () => {
  const { t, i18n } = useTypeSafeTranslation();
  const navigate = useNavigate();
  
  const [visibleElements, setVisibleElements] = useState({
    heroTitle: false,
    heroSubtitle: false,
    optionCard1: false,
    optionCard2: false
  });

  // Update page title when language changes
  useEffect(() => {
    document.title = t('siteName');
  }, [t, i18n.language]);

  // Navigation handlers
  const handleConfessClick = () => {
    navigate('/confession');
  };

  const handleHelpClick = () => {
    navigate('/help');
  };

  const handleAdminClick = () => {
    navigate('/admin/login');
  };

  // Add animation when component mounts
  useEffect(() => {
    const timers = [
      setTimeout(() => setVisibleElements(prev => ({ ...prev, heroTitle: true })), 100),
      setTimeout(() => setVisibleElements(prev => ({ ...prev, heroSubtitle: true })), 300),
      setTimeout(() => setVisibleElements(prev => ({ ...prev, optionCard1: true })), 500),
      setTimeout(() => setVisibleElements(prev => ({ ...prev, optionCard2: true })), 700)
    ];

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  return (
    <Layout>
      <section id="home-view">
        <div className="hero">
          <div className="container">
            <h1 className={`hero-title ${visibleElements.heroTitle ? 'visible' : ''}`}>
              {t('homeTitle')}
            </h1>
            <p className={`hero-subtitle ${visibleElements.heroSubtitle ? 'visible' : ''}`}>
              {t('homeSubtitle')}
            </p>
          </div>
        </div>

        <div className="container options-container">
          <div className="option-cards">
            <div 
              className={`option-card ${visibleElements.optionCard1 ? 'visible' : ''}`}
              onClick={handleConfessClick}
              role="button"
              tabIndex={0}
            >
              <div className="option-icon" style={{ backgroundColor: '#f0f5ff' }}>
                <FontAwesomeIcon icon={faComments} style={{ color: '#4285F4' }} />
              </div>
              <h2>{t('confessCardTitle')}</h2>
              <p>{t('confessCardDesc')}</p>
              <div className="btn-primary">
                {t('startConfession')}
              </div>
            </div>

            <div 
              className={`option-card ${visibleElements.optionCard2 ? 'visible' : ''}`}
              onClick={handleHelpClick}
              role="button"
              tabIndex={0}
            >
              <div className="option-icon" style={{ backgroundColor: '#f0f5ff' }}>
                <FontAwesomeIcon icon={faHandsHelping} style={{ color: '#4285F4' }} />
              </div>
              <h2>{t('helpCardTitle')}</h2>
              <p>{t('helpCardDesc')}</p>
              <div className="btn-primary" style={{ backgroundColor: 'white', color: '#4285F4', border: '1px solid #4285F4' }}>
                {t('goHelp')}
              </div>
            </div>
          </div>
        </div>

        {/* Admin access link */}
        <div style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000
        }}>
          <button
            onClick={handleAdminClick}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '50%',
              width: 48,
              height: 48,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              transition: 'all 0.3s ease',
              opacity: 0.7
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = '0.7';
              e.currentTarget.style.transform = 'scale(1)';
            }}
            title="管理员登录"
          >
            <FontAwesomeIcon icon={faCrown} />
          </button>
        </div>
      </section>
    </Layout>
  );
};

export default HomePage;