function sendNotification() {
  return new Notification("通知标题：", {
    body: "通知内容",
    icon: "https://pic1.zhuanstatic.com/zhuanzh/50b6ffe4-c7e3-4317-bc59-b2ec4931f325.png",
  });
}

export function getNotificationGrant() {
  if (window.Notification.permission === "granted") { // 判断是否有权限
    return;
  }
  window.Notification.requestPermission((_) => { // 没有权限发起请求
    return true;
  });
}

export function sendNotificationWithGrant() {
  if (window.Notification.permission === "granted") { // 判断是否有权限
    sendNotification();
  }
  else if (window.Notification.permission !== "denied") {
    window.Notification.requestPermission((_) => { // 没有权限发起请求
      sendNotification();
    });
  }
}
