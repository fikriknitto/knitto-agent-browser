declare namespace AuthApi {
  interface ResponseLogin {
    token: string;
    username: string;
  }
  interface PayloadLogin {
    username: string;
    password: string;
  }
  interface Me {
    id: number;
    username: string;
    fullname: string;
  }
}
