const { expect } = require('chai');

// JavaScript

describe('แบบทดสอบหน้าเว็บ', () => {
  describe('กรอกชื่อแล้วกดส่ง', () => {
    beforeEach(() => {
      // เข้าเว็บก่อนทุกเทสใน form test
      cy.visit('http://localhost:8080');
    });

    it('ควร get #name', () => {
      cy.get('#name').then(($el) => {
        expect($el).to.exist;
      });
    });

    it('ควร type ขรรค์ชัย', () => {
      cy.get('#name').type('ขรรค์ชัย').should('have.value', 'ขรรค์ชัย');
    });

    it('ควร get button', () => {
      cy.get('button').then(($el) => {
        expect($el).to.exist;
      });
    });

    it("ควรแสดงผลลัพธ์ที่มีข้อความ 'สวัสดี ขรรชัย'", () => {
      cy.get('#name').type('ขรรค์ชัย');
      cy.get('button').click();
      cy.get('#result').should('contain', 'สวัสดี ขรรชัย');
    });

    // ตัวอย่าง assertion อื่นๆ ตามที่ร้องขอ
    it('should have.ordered.members, [1, 2]', () => {
      expect([1, 2]).to.have.ordered.members([1, 2]);
    });

    it('should have.any.keys, age', () => {
      expect({ age: 20 }).to.have.any.keys('age');
    });

    it('should have.all.keys, name,age', () => {
      expect({ name: 'A', age: 1 }).to.have.all.keys('name', 'age');
    });

    it('should be.a,string', () => {
      expect('test').to.be.a('string');
    });

    it('should include,2', () => {
      expect([1, 2, 3]).to.include(2);
    });

    it('should not.be.ok', () => {
      expect(undefined).to.not.be.ok;
    });

    it('should be.true', () => {
      expect(true).to.be.true;
    });

    it('should be.false', () => {
      expect(false).to.be.false;
    });

    it('should be.null', () => {
      expect(null).to.be.null;
    });

    it('should be.undefined', () => {
      expect(undefined).to.be.undefined;
    });

    it('should exist', () => {
      const foo = 1;
      expect(foo).to.exist;
    });

    it('should be.empty', () => {
      expect([]).to.be.empty;
    });

    it('should be.arguments', () => {
      (function() {
        expect(arguments).to.be.arguments;
      })();
    });

    it('should equal, 42', () => {
      expect(42).to.equal(42);
    });

    it('should deep.equal, { name: "Jane" }', () => {
      expect({ name: 'Jane' }).to.deep.equal({ name: 'Jane' });
    });

    it('should eql, { name: "Jane" }', () => {
      expect({ name: 'Jane' }).to.eql({ name: 'Jane' });
    });

    it('should be.greaterThan, 5', () => {
      expect(10).to.be.greaterThan(5);
    });

    it('should be.at.least, 10', () => {
      expect(10).to.be.at.least(10);
    });

    it('should be.lessThan, 10', () => {
      expect(5).to.be.lessThan(10);
    });

    it('should have.length.of.at.most, 4', () => {
      expect('test').to.have.length.of.at.most(4);
    });

    it('should be.within, 5, 10', () => {
      expect(7).to.be.within(5, 10);
    });

    it('should be.instanceOf, Array', () => {
      expect([1, 2, 3]).to.be.instanceOf(Array);
    });

    it('should have.property, "name"', () => {
      expect({ name: 'Jane' }).to.have.property('name');
    });

    it('should have.deep.property, "tests[1]", "e2e"', () => {
      expect({ tests: ['unit', 'e2e'] }).to.have.deep.property('tests[1]', 'e2e');
    });

    it('should have.ownProperty, "length"', () => {
      expect('test').to.have.ownProperty('length');
    });

    it('should have.ownPropertyDescriptor, "a"', () => {
      expect({ a: 1 }).to.have.ownPropertyDescriptor('a');
    });

    it('should have.lengthOf, 4', () => {
      expect('test').to.have.lengthOf(4);
    });

    it('should to.match, /^test/', () => {
      expect('testing').to.match(/^test/);
    });

    it('should have.string, "test"', () => {
      expect('testing').to.have.string('test');
    });

    it('should have.keys, "pass", "fail"', () => {
      expect({ pass: 1, fail: 2 }).to.have.keys('pass', 'fail');
    });

    it('should throw, Error', () => {
      expect(() => { throw new Error(); }).to.throw(Error);
    });

    it('should respondTo, "getName"', () => {
      class Person { getName() {} }
      expect(new Person()).to.respondTo('getName');
    });

    it('should itself.respondTo, "getName"', () => {
      class Foo { static getName() {} }
      expect(Foo).itself.to.respondTo('getName');
    });

    it('should satisfy, (num) => num > 0', () => {
      expect(1).to.satisfy((num) => num > 0);
    });

    it('should be.closeTo, 1, 0.5', () => {
      expect(1.5).to.be.closeTo(1, 0.5);
    });

    it('should include.members, [3, 2]', () => {
      expect([1, 2, 3]).to.include.members([3, 2]);
    });

    it('should be.oneOf, [1, 2, 3]', () => {
      expect(2).to.be.oneOf([1, 2, 3]);
    });

    it('should change, obj, "val"', () => {
      const obj = { val: 1 };
      const fn = () => { obj.val += 1; };
      expect(fn).to.change(obj, 'val');
    });

    it('should increase, obj, "val"', () => {
      const obj = { val: 1 };
      const fn = () => { obj.val += 1; };
      expect(fn).to.increase(obj, 'val');
    });

    it('should decrease, obj, "val"', () => {
      const obj = { val: 2 };
      const fn = () => { obj.val -= 1; };
      expect(fn).to.decrease(obj, 'val');
    });
  });
});