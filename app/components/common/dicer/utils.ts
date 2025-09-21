const UNTIL = {
  doesHaveArg: (args: string[], arg: string) => {
    // 转化为小写并去除空格
    const argsFmt = args.map(arg => arg.trim().toLowerCase());
    const res = argsFmt.includes(arg.toLowerCase());
    // 如果包含该参数，则移除该参数
    const index = argsFmt.indexOf(arg.toLowerCase());
    if (res) {
      args.splice(index, 1);
    }
    return res;
  },
};

export default UNTIL;
