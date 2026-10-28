import React from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useProfile } from './hooks/useProfile'
import { ProfileHeader } from './components/ProfileHeader'
import { PersonalInfoSection } from './components/PersonalInfoSection'
import { LearningGoalsSection } from './components/LearningGoalsSection'
import { PrivacySection } from './components/PrivacySection'
import { SecuritySection } from './components/SecuritySection'
import { DangerZoneSection } from './components/DangerZoneSection'
import { ProfileSkeleton } from './components/ProfileSkeleton'
import { ErrorBoundary } from '@/app/ErrorBoundary'
import { useToast } from '@/components/toast/toastContext'
import { Button } from '@/components/ui/button'
import './profile.css'

const ProfileTabContent: React.FC = () => {
  const {
    user,
    profile,
    activeGoal,
    goals,
    oauthIdentities,
    streak,
    loading,
    error,
    isUploadingAvatar,
    reload,
    savePersonalInfo,
    uploadAvatar,
    deleteAvatar,
    updateVisibility,
    changePassword,
    createGoal,
    updateGoalStatus,
    unlinkOAuth,
  } = useProfile()

  const { toast } = useToast()
  const shouldReduceMotion = useReducedMotion()

  const handleShowToast = (message: string, tone: 'success' | 'error' | 'info' = 'info') => {
    toast({
      title: message,
      tone,
      duration: 3500,
    })
  }

  if (loading) {
    return <ProfileSkeleton />
  }

  if (error && !user && !profile) {
    return (
      <div className="profile-section-card text-center py-12" role="alert">
        <AlertCircle size={40} className="mx-auto text-destructive mb-3" aria-hidden="true" />
        <h3 className="text-lg font-bold text-[var(--overview-text)] mb-2">Không thể tải thông tin hồ sơ</h3>
        <p className="text-sm text-[var(--overview-muted)] mb-6 max-w-md mx-auto">{error}</p>
        <Button type="button" onClick={() => void reload()} className="profile-save-btn mx-auto">
          <RefreshCw size={16} aria-hidden="true" />
          Thử lại
        </Button>
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: shouldReduceMotion ? 1 : 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: shouldReduceMotion ? 1 : 0, y: shouldReduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: 'easeOut' as const },
    },
  }

  return (
    <motion.div
      className="profile-tab-root"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 1. Header with Cover, Avatar, Badges & Interactive Chips */}
      <motion.div variants={itemVariants}>
        <ProfileHeader
          user={user}
          profile={profile}
          activeGoal={activeGoal}
          streak={streak}
          onUploadAvatar={uploadAvatar}
          onDeleteAvatar={deleteAvatar}
          isUploadingAvatar={isUploadingAvatar}
          onShowToast={handleShowToast}
        />
      </motion.div>

      {/* 2. Personal Info (In-place View <-> Edit) */}
      <motion.div variants={itemVariants}>
        <PersonalInfoSection
          user={user}
          profile={profile}
          onSave={savePersonalInfo}
          onShowToast={handleShowToast}
        />
      </motion.div>

      {/* 3. Learning Goals */}
      <motion.div variants={itemVariants}>
        <LearningGoalsSection
          activeGoal={activeGoal}
          goals={goals}
          onCreateGoal={createGoal}
          onUpdateStatus={updateGoalStatus}
          onShowToast={handleShowToast}
        />
      </motion.div>

      {/* 4. Privacy */}
      <motion.div variants={itemVariants}>
        <PrivacySection
          profile={profile}
          onUpdateVisibility={updateVisibility}
          onShowToast={handleShowToast}
        />
      </motion.div>

      {/* 5. Security (Password & OAuth) */}
      <motion.div variants={itemVariants}>
        <SecuritySection
          oauthIdentities={oauthIdentities}
          onChangePassword={changePassword}
          onUnlinkOAuth={unlinkOAuth}
          onShowToast={handleShowToast}
        />
      </motion.div>

      {/* 6. Danger Zone (Avatar Deletion) */}
      <motion.div variants={itemVariants}>
        <DangerZoneSection
          profile={profile}
          onDeleteAvatar={deleteAvatar}
          isDeleting={isUploadingAvatar}
          onShowToast={handleShowToast}
        />
      </motion.div>
    </motion.div>
  )
}

export const ProfileTab: React.FC = () => {
  return (
    <ErrorBoundary title="Không thể tải trang cá nhân">
      <ProfileTabContent />
    </ErrorBoundary>
  )
}
