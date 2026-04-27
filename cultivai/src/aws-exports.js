const awsExports = {
  Auth: {
    Cognito: {
      userPoolId: 'ap-south-1_mE3Gc8Njk',
      userPoolClientId: '88705g0ekd0onm76dc1p418ve',
      signUpVerificationMethod: 'code',
      loginWith: { 
        email: true, 
        username: false, 
        phone: false,
        oauth: {
          domain: 'ap-south-1me3gc8njk.auth.ap-south-1.amazoncognito.com',
          scopes: ['email', 'openid', 'profile'], 
          redirectSignIn: ['http://localhost:3000/dashboard','https://cultivai-final-deployment-part2-eoi.vercel.app/dashboard'],
          redirectSignOut: ['http://localhost:3000/login','https://cultivai-final-deployment-part2-eoi.vercel.app/login'],
          responseType: 'code',
          providers: ['Google']
        }
      }
    }
  }
};

export default awsExports;