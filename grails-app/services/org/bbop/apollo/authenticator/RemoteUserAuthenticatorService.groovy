package org.bbop.apollo.authenticator

import grails.transaction.Transactional
import org.apache.shiro.SecurityUtils
import org.apache.shiro.authc.AuthenticationException
import org.apache.shiro.authc.UsernamePasswordToken
import org.apache.shiro.crypto.hash.Sha256Hash
import org.apache.shiro.subject.Subject
import org.bbop.apollo.Role
import org.bbop.apollo.User
import org.bbop.apollo.UserGroup
import org.bbop.apollo.UserService
import org.bbop.apollo.gwt.shared.ClientTokenGenerator
import org.bbop.apollo.gwt.shared.FeatureStringEnum
import org.bbop.apollo.gwt.shared.GlobalPermissionEnum

import javax.servlet.http.HttpServletRequest

@Transactional
class RemoteUserAuthenticatorService implements AuthenticatorService {

    String defaultGroup

    static String INTERNAL_PASSWORD = "INTERNAL_PASSWORD"

    def authenticate(HttpServletRequest request) {
        User user
        UsernamePasswordToken authToken = new UsernamePasswordToken()
        String randomPassword = ClientTokenGenerator.generateRandomString()
        String passwordHash = new Sha256Hash(randomPassword).toHex()
        Subject subject
        try {
            subject = SecurityUtils.getSubject()

            String remoteUser
            // for testing
//            if (!request.getHeader(FeatureStringEnum.REMOTE_USER.value)) {
//                remoteUser = "abcd@125.com"
//            } else {
//            remoteUser = request.getHeader(FeatureStringEnum.REMOTE_USER.value)
//            }

            // for testing
            Enumeration allHeaders = request.getHeaderNames()
            log.debug "all headers in request:"
            while( allHeaders.hasMoreElements() ) {
               String headerName    = allHeaders.nextElement()
               String headerValue   = request.getHeader(headerName)
               log.debug "   ${headerName}: ${headerValue}"
            }

            String remoteUserHeader = FeatureStringEnum.REMOTE_USER.value
            remoteUser = request.getHeader(remoteUserHeader)
            // fall back to alternative remote user headers for remote user
            // (see FeatureStringEnum.java, but expect these to be something like
            // REMOTE-USER or X-Remote-User)
            if (!remoteUser) {
               log.debug "no remote user in header ${remoteUserHeader}"
               remoteUserHeader = FeatureStringEnum.REMOTE_USER_HYPHEN.value
               remoteUser       = request.getHeader(remoteUserHeader)
               if (!remoteUser) {
                  log.debug "no remote user in header ${remoteUserHeader}"
                  remoteUserHeader = FeatureStringEnum.REMOTE_USER_PREFIX.value
                  remoteUser       = request.getHeader(remoteUserHeader)
                  if (!remoteUser) {
                     log.debug "no remote user in header ${remoteUserHeader}"
                     log.debug "no more headers to check for remote user"
                  } else {
                     log.debug "successfully read remote user value \"${remoteUser}\" from header ${remoteUserHeader}"
                  }
               } else {
                  log.debug "successfully read remote user value \"${remoteUser}\" from header ${remoteUserHeader}"
               }
            } else {
               log.debug "successfully read remote user value \"${remoteUser}\" from header ${remoteUserHeader}"
            }

            if (remoteUser) {
               log.warn "Remote user found in  ${remoteUserHeader} header [${remoteUser}]"
            }
            else {
                log.warn("No remote user passed in header!")
                return false
            }

            authToken.username = remoteUser
            user = User.findByUsername(authToken.username)
            log.warn "User exists ${user} ? "
            log.warn "for username: ${authToken.username}"
            if (!user) {

                log.warn "User does not exist so creating new user."

                user = new User(
                        username: remoteUser,
                        passwordHash: passwordHash,
                        firstName: "REMOTE_USER",
                        lastName: "${remoteUser}",
                        metadata: randomPassword  // reversible autogenerated password
                )
                user.addMetaData(INTERNAL_PASSWORD,randomPassword)
                user.save(flush: true, failOnError: true, insert: true)

                Role role = Role.findByName(GlobalPermissionEnum.USER.name())
                log.debug "adding role: ${role}"
                user.addToRoles(role)
                role.addToUsers(user)

                if (this.defaultGroup) {
                    log.debug "adding user to default group: ${this.defaultGroup}"
                    UserGroup userGroup = UserGroup.findByName(this.defaultGroup)

                    userGroup = userGroup ?: new UserGroup(name: this.defaultGroup).save(flush: true)

                    user.addToUserGroups(userGroup)
                }

                role.save()
                user.save(flush: true)
                log.warn "User created ${user}"
            }

            authToken.password = user.getMetaData(INTERNAL_PASSWORD)
            subject.login(authToken)

            return true
        } catch (AuthenticationException ae) {
            log.error("Problem authenticating: " + ae.fillInStackTrace())
            // force authentication
            log.error "Failed to authenticate user ${authToken.username}, resaving password and forcing"
            user.addMetaData(INTERNAL_PASSWORD,randomPassword)
            user.passwordHash = passwordHash
            log.warn("reset password and saving: " + user.getMetaData(INTERNAL_PASSWORD))
            user.save(flush: true, failOnError: true, insert: false)
            authToken.password = user.getMetaData(INTERNAL_PASSWORD)
            log.warn("logging in again")
            subject.login(authToken)
            if (subject.authenticated) {
                log.warn("success!")
                return true
            } else {
                log.warn("fail!")
                return false
            }
        }

    }

    //    @Override
    def authenticate(UsernamePasswordToken authToken, HttpServletRequest request) {
        // token is ignored
        return authenticate(request)
    }

    def setDefaultGroup(String defaultGroup) {
        this.defaultGroup = defaultGroup
    }

    @Override
    Boolean requiresToken() {
        return false
    }
}
