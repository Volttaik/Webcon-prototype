import { NextRequest, NextResponse } from "next/server";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAuthSession } from "@/lib/auth-server";

type Bank = { code: string; name: string };

const NIGERIAN_BANKS: Bank[] = [
  { code: "044", name: "Access Bank" },
  { code: "063", name: "Access Bank (Diamond)" },
  { code: "035A", name: "ALAT by Wema" },
  { code: "401", name: "ASO Savings and Loans" },
  { code: "50931", name: "Bowen Microfinance Bank" },
  { code: "565", name: "Carbon" },
  { code: "50204", name: "Rand Merchant Bank" },
  { code: "50162", name: "Ekondo Microfinance Bank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank" },
  { code: "501", name: "FSDH Merchant Bank" },
  { code: "00103", name: "Globus Bank" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "50383", name: "Hasal Microfinance Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "50211", name: "Kuda Bank" },
  { code: "90267", name: "Kuda Microfinance Bank" },
  { code: "50515", name: "Moniepoint MFB" },
  { code: "100002", name: "Paga" },
  { code: "999991", name: "PalmPay" },
  { code: "50746", name: "Parallex Bank" },
  { code: "526", name: "Parkway - ReadyCash" },
  { code: "999992", name: "OPay" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "125", name: "Rubies MFB" },
  { code: "51310", name: "Sparkle Microfinance Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "Suntrust Bank" },
  { code: "302", name: "TAJBank" },
  { code: "51211", name: "TCF MFB" },
  { code: "102", name: "Titan Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank For Africa" },
  { code: "215", name: "Unity Bank" },
  { code: "566", name: "VFD Microfinance Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
];

let cachedBanks: Bank[] | null = null;
let cachedBanksAt = 0;

async function getAllNigerianBanks(paystackKey: string): Promise<Bank[]> {
  const FIVE_MIN = 5 * 60 * 1000;
  if (cachedBanks && Date.now() - cachedBanksAt < FIVE_MIN) {
    return cachedBanks;
  }
  try {
    const res = await fetch(
      "https://api.paystack.co/bank?country=nigeria&perPage=200",
      { headers: { Authorization: `Bearer ${paystackKey}` } }
    );
    const json = (await res.json()) as {
      status?: boolean;
      data?: { code: string; name: string }[];
    };
    if (json.status && Array.isArray(json.data) && json.data.length > 0) {
      cachedBanks = json.data.map((b) => ({ code: b.code, name: b.name }));
      cachedBanksAt = Date.now();
      return cachedBanks;
    }
  } catch {
    /* fall through to fallback */
  }
  return NIGERIAN_BANKS;
}

async function resolveAccount(
  paystackKey: string,
  accountNumber: string,
  bankCode: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
      { headers: { Authorization: `Bearer ${paystackKey}` } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      status?: boolean;
      data?: { account_name?: string };
    };
    return json.status && json.data?.account_name
      ? json.data.account_name
      : null;
  } catch {
    return null;
  }
}

async function autoResolveAccount(
  paystackKey: string,
  accountNumber: string
): Promise<{ bank: Bank; accountName: string } | null> {
  const banks = await getAllNigerianBanks(paystackKey);

  // Resolve in parallel chunks to respect Paystack's rate limit (~30 req/sec)
  const CHUNK_SIZE = 12;
  for (let i = 0; i < banks.length; i += CHUNK_SIZE) {
    const chunk = banks.slice(i, i + CHUNK_SIZE);
    const results = await Promise.all(
      chunk.map(async (bank) => {
        const name = await resolveAccount(paystackKey, accountNumber, bank.code);
        return name ? { bank, accountName: name } : null;
      })
    );
    const found = results.find((r): r is { bank: Bank; accountName: string } => r !== null);
    if (found) return found;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = (await request.json()) as {
      bankCode?: string;
      accountNumber?: string;
      verifyOnly?: boolean;
    };
    const accountNumber = (body.accountNumber || "").trim();
    const bankCode = (body.bankCode || "").trim();
    const verifyOnly = body.verifyOnly ?? false;

    if (!accountNumber) {
      return NextResponse.json(
        { error: "Account number is required" },
        { status: 400 }
      );
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { error: "Account number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackKey) {
      return NextResponse.json(
        { error: "Payment processing is not configured yet" },
        { status: 503 }
      );
    }

    // Step 1: Resolve account name (auto-detect bank if not provided)
    let resolvedBankCode = bankCode;
    let resolvedBankName = "";
    let accountName = "";

    if (bankCode) {
      const name = await resolveAccount(paystackKey, accountNumber, bankCode);
      if (!name) {
        return NextResponse.json(
          {
            error:
              "Could not verify this account. Please check the account number and bank.",
          },
          { status: 400 }
        );
      }
      accountName = name;
      const banks = await getAllNigerianBanks(paystackKey);
      resolvedBankName =
        banks.find((b) => b.code === bankCode)?.name || "";
    } else {
      const match = await autoResolveAccount(paystackKey, accountNumber);
      if (!match) {
        return NextResponse.json(
          {
            error:
              "Could not find this account at any supported bank. Please double-check the account number.",
          },
          { status: 400 }
        );
      }
      accountName = match.accountName;
      resolvedBankCode = match.bank.code;
      resolvedBankName = match.bank.name;
    }

    // If only verifying, return here
    if (verifyOnly) {
      return NextResponse.json({
        accountName,
        bankCode: resolvedBankCode,
        bankName: resolvedBankName,
      });
    }

    // Step 2: Create transfer recipient
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    const recipientRes = await fetch(
      "https://api.paystack.co/transferrecipient",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "nuban",
          name: accountName,
          account_number: accountNumber,
          bank_code: resolvedBankCode,
          currency: "NGN",
          metadata: { user_id: session.userId, email: user?.email },
        }),
      }
    );

    const recipientData = (await recipientRes.json()) as {
      status: boolean;
      data?: { recipient_code: string };
    };

    if (!recipientData.status || !recipientData.data?.recipient_code) {
      return NextResponse.json(
        { error: "Failed to register bank account with Paystack" },
        { status: 500 }
      );
    }

    const recipientCode = recipientData.data.recipient_code;

    // Step 3: Save to user profile
    await db
      .update(usersTable)
      .set({ paystackRecipientCode: recipientCode })
      .where(eq(usersTable.id, session.userId));

    return NextResponse.json({
      accountName,
      bankCode: resolvedBankCode,
      bankName: resolvedBankName,
      recipientCode,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session)
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);

    return NextResponse.json({
      hasRecipient: !!user?.paystackRecipientCode,
      recipientCode: user?.paystackRecipientCode ?? null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
