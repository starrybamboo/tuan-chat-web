import { CommandExecutor, RuleNameSpace } from "@/components/common/dicer/cmd";
import { parseDiceExpression, rollDice } from "@/components/common/dicer/dice";
import UNTIL from "@/components/common/dicer/utils";

const ruleCofd = new RuleNameSpace(
    4,
    "CofD",
    [],
    "CofDָ�",
);

export default ruleCofd;

const cmdWw = new CommandExecutor(
    "ww",
    [],
    "����CofD�춨",
    [".ww 10a10k8", ".ww 5a8k6", ".ww 7k6"],
    "ww [������]a[��������]?k[�ɹ�����]?",
    async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
        if (args.length === 0) {
            cpi.sendMsg(prop, "����ȱ�ٲ�������ʽӦΪ .ww [������]a[��������]?k[�ɹ�����]?");
            return false;
        }

        // ��������
        const input = args[0].toLowerCase();

        // ʹ��������ʽ����������ʽ
        const match = input.match(/^(\d+)(?:a(\d+))?k(\d+)$/);
        if (!match) {
            cpi.sendMsg(prop, "���󣺲�����ʽ����ȷ��ӦΪ [������]a[��������]?k[�ɹ�����]������ .ww 10a10k8");
            return false;
        }

        const diceCount = parseInt(match[1]);
        const againValue = match[2] ? parseInt(match[2]) : 10; // ȱʡֵΪ10
        const successValue = parseInt(match[3]); // �ɹ�����

        if (diceCount <= 0 || diceCount > 1000) {
            cpi.sendMsg(prop, "����������������1-1000֮��");
            return false;
        }

        if (againValue < 1 || againValue > 10) {
            cpi.sendMsg(prop, "���󣺼�������������1-10֮��");
            return false;
        }

        if (successValue < 1 || successValue > 10) {
            cpi.sendMsg(prop, "���󣺳ɹ�����������1-10֮��");
            return false;
        }

        if (againValue < successValue) {
            cpi.sendMsg(prop, "���󣺼�������������ڵ��ڳɹ�����");
            return false;
        }
        // ����Ͷ��
        const result = rollCofdDice(diceCount, againValue, successValue);

        cpi.sendMsg(prop, result);
        return true;
    },
);
ruleCofd.addCmd(cmdWw);

/**
 * @param diceCount ��ʼ������
 * @param againValue �����������ݴ�ֵ������
 * @param successValue �ɹ��������ݴ�ֵ�ɹ���
 * @returns ��ʽ���Ľ���ַ���
 */
function rollCofdDice(diceCount: number, againValue: number, successValue: number): string {
    let totalSuccesses = 0;
    let round = 1;
    const allRolls: (number[] | string)[] = [];
    let currentDice = diceCount;
    let totalDiceRolled = 0;

    // ��һ��Ͷ��
    let currentRolls: number[] = [];
    for (let i = 0; i < currentDice; i++) {
        const roll = Math.floor(Math.random() * 10) + 1;
        currentRolls.push(roll);
        if (roll >= successValue) {
            totalSuccesses++;
        }
    }
    totalDiceRolled += currentDice;

    // �������������25��ʹ�ü򻯼�¼
    if (totalDiceRolled <= 25) {
        allRolls.push([...currentRolls]);
    }

    //����
    let extraDice = currentRolls.filter(roll => roll >= againValue).length;

    while (extraDice > 0) {
        round++;
        currentDice = extraDice;
        currentRolls = [];

        for (let i = 0; i < currentDice; i++) {
            const roll = Math.floor(Math.random() * 10) + 1;
            currentRolls.push(roll);
            if (roll >= successValue) {
                totalSuccesses++;
            }
        }
        totalDiceRolled += currentDice;

        // ���������������25��ֹͣ��¼������ֵ
        if (totalDiceRolled <= 25) {
            allRolls.push([...currentRolls]);
        }

        extraDice = currentRolls.filter(roll => roll >= againValue).length;
    }

    // ��������ַ���
    let resultString = `${diceCount}a${againValue}k${successValue}=[�ɹ�${totalSuccesses} ����:${round} `;

    if (totalDiceRolled <= 25) {
        // ��ϸ��¼ģʽ
        const formattedRolls = allRolls.map((roundRolls, roundIndex) => {
            const isFirstRound = roundIndex === 0;
            const formattedDice = (roundRolls as number[]).map(roll => {
                let result = roll.toString();
                const isSuccess = roll >= successValue;
                const triggersAgain = roll >= againValue;

                if (isSuccess) {
                    result += "*";
                }
                if (triggersAgain && !isFirstRound) {
                    result = `<${result}>`;
                }
                return result;
            });
            return `{${formattedDice.join(",")}}`;
        });
        resultString += `${formattedRolls.join(",")}`;
    } else {
        // �򻯼�¼ģʽ - ֻ��ʾ����������Ϣ
        resultString += `(��${totalDiceRolled}ö����)`;
    }

    resultString += `]=${totalSuccesses}`;
    return resultString;
}
ruleCofd.addCmd(cmdWw);
const cmdRa = new CommandExecutor(
    "ra",
    [],
    "���ڽ�ɫ���Խ���World of Darkness���춨",
    [".ra ����+���� a10k8", ".ra ����-���� k6", ".ra ����+����+����"],
    "ra <���Ա��ʽ> [a(��������)]?[k(�ɹ�����)]?",
    async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
        if (args.length === 0) {
            cpi.sendMsg(prop, "����ȱ�ٲ�������ʽӦΪ .ra <���Ա��ʽ> [a(��������)]?[k(�ɹ�����)]?");
            return false;
        }

        // ��ȡ��ɫ����
        const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
        if (!curAbility?.ability && !curAbility?.skill && !curAbility?.basic) {
            cpi.sendMsg(prop, "����δ�ҵ���ɫ��������");
            return false;
        }

        // �ϲ����в���Ϊһ���ַ���
        const input = args.join(" ").toLowerCase();

        // ʹ��������ʽ�������Ա��ʽ�Ϳɵ�����
        const paramMatch = input.match(/(a\d+k\d+)$|(a\d+)$|(k\d+)$/);
        let attributeExpr = input;
        let againValue = 10; // Ĭ�ϼ�������
        let successValue = 8; // Ĭ�ϳɹ�����

        if (paramMatch) {
            // ��ȡ�ɵ���������
            const paramStr = paramMatch[0];
            attributeExpr = input.substring(0, input.length - paramStr.length).trim();

            // ������������
            const aMatch = paramStr.match(/a(\d+)/);
            if (aMatch) {
                againValue = parseInt(aMatch[1]);
            }

            // �����ɹ�����
            const kMatch = paramStr.match(/k(\d+)/);
            if (kMatch) {
                successValue = parseInt(kMatch[1]);
            }
        }

        // ��֤������Χ
        if (againValue < 1 || againValue > 10) {
            cpi.sendMsg(prop, "���󣺼�������������1-10֮��");
            return false;
        }

        if (successValue < 1 || successValue > 10) {
            cpi.sendMsg(prop, "���󣺳ɹ�����������1-10֮��");
            return false;
        }

        // �������Ա��ʽ������������
        const diceCount = await calculateAttributeExpression(attributeExpr, curAbility, cpi, prop);
        if (diceCount === null) {
            return false; // ������Ϣ���ں����ڲ�����
        }

        if (diceCount <= 0) {
            cpi.sendMsg(prop, "���󣺼������������������0");
            return false;
        }

        if (diceCount > 1000) {
            cpi.sendMsg(prop, "���󣺼��������������ܳ���1000");
            return false;
        }

        // ����Ͷ��
        const result = rollCofdDice(diceCount, againValue, successValue);

        cpi.sendMsg(prop, result);
        return true;
    },
);
ruleCofd.addCmd(cmdRa);

/**
 * �������Ա��ʽ������������
 * @param expr ���Ա��ʽ���� "����+����-����"
 * @param ability ��ɫ��������
 * @param cpi CPIʵ��
 * @param prop ִ��������
 * @returns �����������������������null
 */
async function calculateAttributeExpression(
    expr: string,
    ability: any,
    cpi: CPI,
    prop: ExecutorProp
): Promise<number | null> {
    // ������ʽ���Ƴ�����ո�
    expr = expr.replace(/\s+/g, '');

    // ʹ��������ʽ�ָ���ʽΪ�������������
    const tokens = expr.split(/([+-])/);
    if (tokens.length === 0 || tokens[0] === '') {
        cpi.sendMsg(prop, "�������Ա��ʽΪ��");
        return null;
    }

    let result = 0;
    let currentOperator = '+';

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token === '+' || token === '-') {
            currentOperator = token;
            continue;
        }

        // ����������
        const attributeName = token.trim();
        if (!attributeName) {
            continue;
        }

        // ��������ֵ
        let attributeValue = UNTIL.getRoleAbilityValue(ability, attributeName);

        if (attributeValue === undefined || attributeValue === null) {
            cpi.sendMsg(prop, `����δ�ҵ�����"${attributeName}"`);
            return null;
        }

        const value = parseInt(attributeValue);
        if (isNaN(value)) {
            cpi.sendMsg(prop, `��������"${attributeName}"��ֵ������Ч����`);
            return null;
        }

        // ���������������
        if (currentOperator === '+') {
            result += value;
        } else {
            result -= value;
        }
    }

    return result;
}
const cmdRi = new CommandExecutor(
    "ri",
    [],
    "�����Ȼ��춨������+����+1d10��",
    [".ri"],
    "ri",
    async (args: string[], mentioned: UserRole[], cpi: CPI, prop: ExecutorProp): Promise<boolean> => {
        // ��ȡ��ɫ����
        const curAbility = await cpi.getRoleAbilityList(mentioned[0].roleId);
        if (!curAbility?.ability && !curAbility?.skill && !curAbility?.basic) {
            cpi.sendMsg(prop, "����δ�ҵ���ɫ��������");
            return false;
        }

        // ��ȡ��������ֵ
        let dexterityValue = UNTIL.getRoleAbilityValue(curAbility, "����");
        if (dexterityValue === undefined || dexterityValue === null) {
            // ����Ӣ��������
            dexterityValue = UNTIL.getRoleAbilityValue(curAbility, "dex");
        }

        if (dexterityValue === undefined || dexterityValue === null) {
            cpi.sendMsg(prop, "����δ�ҵ���ɫ����������");
            return false;
        }

        // ��ȡ��������ֵ
        let composureValue = UNTIL.getRoleAbilityValue(curAbility, "����");
        if (composureValue === undefined || composureValue === null) {
            // ����Ӣ��������
            composureValue = UNTIL.getRoleAbilityValue(curAbility, "composure");
        }

        if (composureValue === undefined || composureValue === null) {
            cpi.sendMsg(prop, "����δ�ҵ���ɫ�ĳ�������");
            return false;
        }

        // ת��Ϊ����
        const dex = parseInt(dexterityValue);
        const comp = parseInt(composureValue);

        if (isNaN(dex) || isNaN(comp)) {
            cpi.sendMsg(prop, "�������ݻ��������ֵ������Ч����");
            return false;
        }

        // ����1d10
        const diceRoll = Math.floor(Math.random() * 10) + 1;

        // ������ֵ
        const total = diceRoll + dex + comp;

        // ���������Ϣ
        const result = `�Ȼ��춨��1d10(${diceRoll}) + ����(${dex}) + ����(${comp}) = ${total}`;

        cpi.sendMsg(prop, result);
        return true;
    },
);
ruleCofd.addCmd(cmdRi);