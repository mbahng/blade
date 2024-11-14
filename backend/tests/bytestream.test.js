import { Hex, Bin, Stream } from "../src/utils/bytestream.js";

describe("Hex Class", () => {
  // Test constructor
  test("constructor with valid hex string", () => {
    const hex = new Hex("A5B4");
    expect(hex.stream).toBe("A5B4");
    expect(hex.length).toBe(16); // 4 bits per hex character
  });

  test("constructor with invalid hex string throws error", () => {
    expect(() => new Hex("G5B4")).toThrow("Not a hex");
  });

  // Test static methods
  test("random hex generation", () => {
    const hex = Hex.random(128);
    expect(hex.length).toBe(128);
    expect(hex.stream).toMatch(/^[0-9A-F]+$/);
  });

  test("fromBigInt conversion", () => {
    const hex = Hex.fromBigInt(255n);
    expect(hex.stream).toBe("FF");
  });

  test("fromBigInt with length padding", () => {
    const hex = Hex.fromBigInt(255n, 16);
    expect(hex.stream).toBe("00FF");
  });

  // Test instance methods
  test("arithmetic operations", () => {
    const a = new Hex("FF");
    const b = new Hex("01");
    
    expect(a.add(b).stream).toBe("100");
    expect(a.sub(b).stream).toBe("FE");
    expect(a.mul(b).stream).toBe("FF");
  });

  test("concatenation", () => {
    const a = new Hex("AA");
    const b = new Hex("BB");
    expect(a.concat(b).stream).toBe("AABB");
  });

  test("split operation", () => {
    const hex = new Hex("AABB");
    const [left, right] = hex.split();
    expect(left.stream).toBe("AA");
    expect(right.stream).toBe("BB");
  });
});

describe("Bin Class", () => {
  test("constructor with valid binary string", () => {
    const bin = new Bin("1010");
    expect(bin.stream).toBe("1010");
    expect(bin.length).toBe(4);
  });

  test("constructor with invalid binary string throws error", () => {
    expect(() => new Bin("1012")).toThrow("Not a binary");
  });

  test("conversion to hex", () => {
    const bin = new Bin("1010");
    expect(bin.toHex().stream).toBe("A");
  });

  test("conversion to BigInt", () => {
    const bin = new Bin("1010");
    expect(bin.toBigInt()).toBe(10n);
  });

  test("random binary generation", () => {
    const bin = Bin.random(8);
    expect(bin.length).toBe(8);
    expect(bin.stream).toMatch(/^[01]+$/);
  });
});

describe("Stream Class", () => {
  test("constructor and length", () => {
    const stream = new Stream("ABC");
    expect(stream.length).toBe(24); // 8 bits per character
  });

  test("conversion to hex", () => {
    const stream = new Stream("A");
    expect(stream.toHex().stream).toBe("41"); // ASCII 'A' is 41 in hex
  });

  test("conversion from hex", () => {
    const stream = Stream.fromHex("41");
    expect(stream.stream).toBe("A");
  });

  test("conversion to and from BigInt", () => {
    const original = new Stream("A");
    const bigInt = original.toBigInt();
    const reconstructed = Stream.fromBigInt(bigInt);
    expect(reconstructed.stream).toBe("A");
  });
});

describe("Conversion Functions", () => {
  test("hex to binary conversion", () => {
    const hex = new Hex("A5");
    const bin = hex.toBin();
    expect(bin.stream).toBe("10100101");
  });

  test("binary to hex conversion", () => {
    const bin = new Bin("10100101");
    const hex = bin.toHex();
    expect(hex.stream).toBe("A5");
  });

  test("hex to decimal and back", () => {
    const original = new Hex("FF");
    const decimal = original.toBigInt();
    const reconstructed = Hex.fromBigInt(decimal);
    expect(reconstructed.stream).toBe("FF");
  });
});
